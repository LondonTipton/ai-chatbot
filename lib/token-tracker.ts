import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = Redis.fromEnv();

/**
 * Token Budget Error
 * Thrown when token budget is exceeded
 */
export class TokenBudgetError extends Error {
  used: number;
  limit: number;

  constructor(message: string, used: number, limit: number) {
    super(message);
    this.name = "TokenBudgetError";
    this.used = used;
    this.limit = limit;
  }
}

/**
 * Daily Token Tracker
 * Tracks token usage per day with automatic reset and milestone logging
 */
export class DailyTokenTracker {
  private readonly redis: Redis;
  private readonly dailyLimit: number;

  constructor(redisClient: Redis, dailyLimit = 800_000) {
    this.redis = redisClient;
    this.dailyLimit = dailyLimit;
  }

  /**
   * Get the Redis key for today's token usage
   */
  private getTodayKey(): string {
    const today = new Date().toISOString().split("T")[0];
    return `tokens:daily:${today}`;
  }

  /**
   * Get current daily token usage
   *
   * @returns Current token usage for today
   */
  async getDailyTokenUsage(): Promise<number> {
    try {
      const key = this.getTodayKey();
      const usage = await this.redis.get<string>(key);
      const tokens = Number.parseInt(usage || "0", 10);

      console.log("[Daily Token Usage]", {
        date: new Date().toISOString().split("T")[0],
        usage: tokens,
        limit: this.dailyLimit,
        percentUsed: `${((tokens / this.dailyLimit) * 100).toFixed(2)}%`,
      });

      return tokens;
    } catch (error) {
      console.error("[Token Tracker Error] Failed to get daily usage", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return 0 on error to avoid blocking operations
      return 0;
    }
  }

  /**
   * Increment daily token usage
   *
   * @param tokens - Number of tokens to add
   * @returns New total token usage
   */
  async incrementDailyTokenUsage(tokens: number): Promise<number> {
    try {
      const key = this.getTodayKey();

      // Increment the counter
      const newTotal = await this.redis.incrby(key, tokens);

      // Set TTL to 2 days (automatic cleanup)
      await this.redis.expire(key, 86_400 * 2);

      // Calculate percentage used
      const percentUsed = (newTotal / this.dailyLimit) * 100;

      // Log milestone warnings
      if (
        percentUsed >= 95 &&
        percentUsed - (tokens / this.dailyLimit) * 100 < 95
      ) {
        console.warn("[Token Usage Milestone] 95% of daily limit reached!", {
          date: new Date().toISOString().split("T")[0],
          usage: newTotal,
          limit: this.dailyLimit,
          percentUsed: `${percentUsed.toFixed(2)}%`,
          remaining: this.dailyLimit - newTotal,
        });
      } else if (
        percentUsed >= 80 &&
        percentUsed - (tokens / this.dailyLimit) * 100 < 80
      ) {
        console.warn("[Token Usage Milestone] 80% of daily limit reached", {
          date: new Date().toISOString().split("T")[0],
          usage: newTotal,
          limit: this.dailyLimit,
          percentUsed: `${percentUsed.toFixed(2)}%`,
          remaining: this.dailyLimit - newTotal,
        });
      }

      // Log the increment
      console.log("[Token Usage Increment]", {
        date: new Date().toISOString().split("T")[0],
        added: tokens,
        newTotal,
        limit: this.dailyLimit,
        percentUsed: `${percentUsed.toFixed(2)}%`,
      });

      return newTotal;
    } catch (error) {
      console.error("[Token Tracker Error] Failed to increment usage", {
        tokens,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if adding tokens would exceed the daily limit
   *
   * @param estimatedTokens - Number of tokens to check
   * @param limit - Optional custom limit (defaults to dailyLimit)
   * @returns True if within limit, false otherwise
   */
  async checkDailyLimit(
    estimatedTokens: number,
    limit?: number
  ): Promise<boolean> {
    try {
      const currentUsage = await this.getDailyTokenUsage();
      const effectiveLimit = limit || this.dailyLimit;
      const wouldExceed = currentUsage + estimatedTokens > effectiveLimit;

      if (wouldExceed) {
        console.warn("[Daily Limit Check] Would exceed daily limit", {
          date: new Date().toISOString().split("T")[0],
          currentUsage,
          estimatedTokens,
          total: currentUsage + estimatedTokens,
          limit: effectiveLimit,
          exceeded: currentUsage + estimatedTokens - effectiveLimit,
        });
      } else {
        console.log("[Daily Limit Check] Within daily limit", {
          date: new Date().toISOString().split("T")[0],
          currentUsage,
          estimatedTokens,
          total: currentUsage + estimatedTokens,
          limit: effectiveLimit,
          remaining: effectiveLimit - (currentUsage + estimatedTokens),
        });
      }

      return !wouldExceed;
    } catch (error) {
      console.error("[Token Tracker Error] Failed to check daily limit", {
        estimatedTokens,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return true on error to avoid blocking operations
      return true;
    }
  }

  /**
   * Get detailed token usage statistics
   *
   * @returns Token usage statistics
   */
  async getUsageStats(): Promise<{
    date: string;
    usage: number;
    limit: number;
    remaining: number;
    percentUsed: number;
    withinLimit: boolean;
  }> {
    const usage = await this.getDailyTokenUsage();
    const remaining = Math.max(0, this.dailyLimit - usage);
    const percentUsed = (usage / this.dailyLimit) * 100;

    return {
      date: new Date().toISOString().split("T")[0],
      usage,
      limit: this.dailyLimit,
      remaining,
      percentUsed: Math.round(percentUsed * 100) / 100,
      withinLimit: usage <= this.dailyLimit,
    };
  }
}

/**
 * Default daily token tracker instance
 * Uses 800,000 tokens as the daily limit (80% of Cerebras 1M limit)
 */
export const dailyTokenTracker = new DailyTokenTracker(redis, 800_000);

/**
 * Helper function to get daily token usage
 */
export function getDailyTokenUsage(): Promise<number> {
  return dailyTokenTracker.getDailyTokenUsage();
}

/**
 * Helper function to increment daily token usage
 */
export function incrementDailyTokenUsage(tokens: number): Promise<number> {
  return dailyTokenTracker.incrementDailyTokenUsage(tokens);
}

/**
 * Helper function to check daily limit
 */
export function checkDailyLimit(
  estimatedTokens: number,
  limit?: number
): Promise<boolean> {
  return dailyTokenTracker.checkDailyLimit(estimatedTokens, limit);
}
