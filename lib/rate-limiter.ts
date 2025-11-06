import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client (optional for local development)
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

/**
 * Rate Limit Error
 * Thrown when a rate limit is exceeded
 */
export class RateLimitError extends Error {
  retryAfter: number;
  limitType: string;

  constructor(message: string, retryAfter: number, limitType: string) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.limitType = limitType;
  }
}

/**
 * Cerebras Rate Limiters
 *
 * Limits (80% threshold):
 * - Tokens per minute: 48,000 (80% of 60,000)
 * - Tokens per day: 800,000 (80% of 1,000,000)
 * - Requests per minute: 24 (80% of 30)
 */
export const cerebrasLimiter = redis
  ? {
      tokensPerMinute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(48_000, "1 m"),
        analytics: true,
        prefix: "cerebras:tokens:minute",
      }),

      tokensPerDay: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(800_000, "24 h"),
        analytics: true,
        prefix: "cerebras:tokens:day",
      }),

      requestsPerMinute: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(24, "1 m"),
        analytics: true,
        prefix: "cerebras:requests:minute",
      }),
    }
  : null;

/**
 * Tavily Rate Limiter
 *
 * Limit (80% threshold):
 * - Requests per minute: 80 (80% of 100)
 */
export const tavilyLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(80, "1 m"),
      analytics: true,
      prefix: "tavily:requests:minute",
    })
  : null;

/**
 * Rate Limit Status
 */
export type RateLimitStatus = {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

/**
 * Check all rate limits before execution
 *
 * @param estimatedTokens - Estimated tokens for the operation
 * @param identifier - Unique identifier for rate limiting (default: "global")
 * @throws {RateLimitError} If any rate limit is exceeded
 */
export async function checkRateLimits(
  estimatedTokens: number,
  identifier = "global"
): Promise<void> {
  // Skip rate limiting if Redis is not configured (local development)
  if (!cerebrasLimiter) {
    console.log("[Rate Limit Check] Skipped (Redis not configured)");
    return;
  }

  try {
    // Check Cerebras token rate limit (per minute)
    const tokensPerMinuteResult = await cerebrasLimiter.tokensPerMinute.limit(
      `${identifier}:tokens`,
      { rate: estimatedTokens }
    );

    if (!tokensPerMinuteResult.success) {
      throw new RateLimitError(
        "Cerebras token rate limit exceeded (per minute)",
        tokensPerMinuteResult.reset,
        "cerebras_tokens_per_minute"
      );
    }

    // Check Cerebras token rate limit (per day)
    const tokensPerDayResult = await cerebrasLimiter.tokensPerDay.limit(
      `${identifier}:tokens:daily`,
      { rate: estimatedTokens }
    );

    if (!tokensPerDayResult.success) {
      throw new RateLimitError(
        "Cerebras daily token limit exceeded",
        tokensPerDayResult.reset,
        "cerebras_tokens_per_day"
      );
    }

    // Check Cerebras request rate limit
    const requestsResult = await cerebrasLimiter.requestsPerMinute.limit(
      `${identifier}:requests`
    );

    if (!requestsResult.success) {
      throw new RateLimitError(
        "Cerebras request rate limit exceeded",
        requestsResult.reset,
        "cerebras_requests_per_minute"
      );
    }

    // Log successful rate limit check
    console.log("[Rate Limit Check]", {
      identifier,
      estimatedTokens,
      tokensPerMinute: {
        remaining: tokensPerMinuteResult.remaining,
        limit: tokensPerMinuteResult.limit,
      },
      tokensPerDay: {
        remaining: tokensPerDayResult.remaining,
        limit: tokensPerDayResult.limit,
      },
      requestsPerMinute: {
        remaining: requestsResult.remaining,
        limit: requestsResult.limit,
      },
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Log rate limit error
      console.error("[Rate Limit Exceeded]", {
        identifier,
        estimatedTokens,
        limitType: error.limitType,
        retryAfter: error.retryAfter,
        message: error.message,
      });
      throw error;
    }

    // Log unexpected error
    console.error("[Rate Limit Check Error]", {
      identifier,
      estimatedTokens,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check Tavily rate limit before search operations
 *
 * @param identifier - Unique identifier for rate limiting (default: "global")
 * @throws {RateLimitError} If rate limit is exceeded
 */
export async function checkTavilyRateLimit(
  identifier = "global"
): Promise<void> {
  // Skip rate limiting if Redis is not configured (local development)
  if (!tavilyLimiter) {
    console.log("[Tavily Rate Limit Check] Skipped (Redis not configured)");
    return;
  }

  try {
    const result = await tavilyLimiter.limit(`${identifier}:tavily`);

    if (!result.success) {
      throw new RateLimitError(
        "Tavily request rate limit exceeded",
        result.reset,
        "tavily_requests_per_minute"
      );
    }

    // Log successful rate limit check
    console.log("[Tavily Rate Limit Check]", {
      identifier,
      remaining: result.remaining,
      limit: result.limit,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Log rate limit error
      console.error("[Tavily Rate Limit Exceeded]", {
        identifier,
        retryAfter: error.retryAfter,
        message: error.message,
      });
      throw error;
    }

    // Log unexpected error
    console.error("[Tavily Rate Limit Check Error]", {
      identifier,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get current rate limit status for Cerebras
 *
 * @param identifier - Unique identifier for rate limiting (default: "global")
 * @returns Rate limit status for all Cerebras limits
 */
export async function getCerebrasRateLimitStatus(
  identifier = "global"
): Promise<{
  tokensPerMinute: RateLimitStatus;
  tokensPerDay: RateLimitStatus;
  requestsPerMinute: RateLimitStatus;
}> {
  // Return mock status if Redis is not configured
  if (!cerebrasLimiter) {
    const mockStatus: RateLimitStatus = {
      success: true,
      remaining: 999_999,
      reset: Date.now() + 60_000,
      limit: 999_999,
    };
    return {
      tokensPerMinute: mockStatus,
      tokensPerDay: mockStatus,
      requestsPerMinute: mockStatus,
    };
  }

  const [tokensPerMinute, tokensPerDay, requestsPerMinute] = await Promise.all([
    cerebrasLimiter.tokensPerMinute.limit(`${identifier}:tokens`, { rate: 0 }),
    cerebrasLimiter.tokensPerDay.limit(`${identifier}:tokens:daily`, {
      rate: 0,
    }),
    cerebrasLimiter.requestsPerMinute.limit(`${identifier}:requests`),
  ]);

  return {
    tokensPerMinute: {
      success: tokensPerMinute.success,
      remaining: tokensPerMinute.remaining,
      reset: tokensPerMinute.reset,
      limit: tokensPerMinute.limit,
    },
    tokensPerDay: {
      success: tokensPerDay.success,
      remaining: tokensPerDay.remaining,
      reset: tokensPerDay.reset,
      limit: tokensPerDay.limit,
    },
    requestsPerMinute: {
      success: requestsPerMinute.success,
      remaining: requestsPerMinute.remaining,
      reset: requestsPerMinute.reset,
      limit: requestsPerMinute.limit,
    },
  };
}

/**
 * Get current rate limit status for Tavily
 *
 * @param identifier - Unique identifier for rate limiting (default: "global")
 * @returns Rate limit status for Tavily
 */
export async function getTavilyRateLimitStatus(
  identifier = "global"
): Promise<RateLimitStatus> {
  // Return mock status if Redis is not configured
  if (!tavilyLimiter) {
    return {
      success: true,
      remaining: 999_999,
      reset: Date.now() + 60_000,
      limit: 999_999,
    };
  }

  const result = await tavilyLimiter.limit(`${identifier}:tavily`);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: result.limit,
  };
}
