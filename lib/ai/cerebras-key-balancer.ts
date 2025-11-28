/**
 * Cerebras API Key Load Balancer - Direct Redis Access
 * Implements battle-tested error handling from Jupyter notebook
 */

import { createCerebras } from "@ai-sdk/cerebras";
import { Redis } from "@upstash/redis";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/cerebras-key-balancer");

// Error classification types
type ErrorType = "rate_limit" | "queue_overflow" | "other";

/**
 * Classify Cerebras API errors (order matters - check queue overflow FIRST)
 */
function classifyCerebrasError(error: any): {
  type: ErrorType;
  retryAfter?: number;
} {
  const statusCode = error?.statusCode || error?.status;
  const message = (error?.message || "").toLowerCase();
  const errorData = error?.data;

  // Check for transient queue overflow FIRST (most common)
  if (
    message.includes("queue_exceeded") ||
    message.includes("high traffic") ||
    message.includes("queue") ||
    errorData?.param === "queue" ||
    errorData?.code === "queue_exceeded"
  ) {
    const retryAfter = parseRetryAfter(error);
    return { type: "queue_overflow", retryAfter: Math.max(60, retryAfter) };
  }

  // True rate limit: HTTP 429 + contains "rate" or "limit"
  // NOTE: Cerebras doesn't tell us WHICH limit (30 RPM, 900 RPH, 14400 RPD) was hit
  if (
    statusCode === 429 &&
    (message.includes("rate") || message.includes("limit"))
  ) {
    return { type: "rate_limit" };
  }

  return { type: "other" };
}

/**
 * Parse Retry-After or x-ratelimit-reset headers from error response
 */
function parseRetryAfter(error: any): number {
  try {
    const response = error?.response;
    const headers = response?.headers || {};

    // Check Retry-After header
    const retryAfter = headers["retry-after"] || headers["Retry-After"];
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10);
      if (!Number.isNaN(seconds)) return seconds;
    }

    // Check x-ratelimit-reset headers
    const resetHeaders = [
      "x-ratelimit-reset-requests",
      "X-RateLimit-Reset-Requests",
      "x-ratelimit-reset-tokens",
      "X-RateLimit-Reset-Tokens",
    ];

    for (const header of resetHeaders) {
      if (headers[header]) {
        const seconds = Number.parseInt(headers[header], 10);
        if (!Number.isNaN(seconds)) return seconds;
      }
    }
  } catch {
    // Ignore parsing errors
  }

  return 60; // Default 60 seconds
}

// In-memory cache for rapid-fire requests
type CachedProvider = {
  provider: ReturnType<typeof createCerebras>;
  keyId: string;
  expiresAt: number;
};

class CerebrasKeyBalancer {
  private static instance: CerebrasKeyBalancer;
  private redis: Redis | undefined;
  private keys: { id: string; value: string }[] = [];
  private localIndex = 0;
  private currentKeyId: string | null = null;
  private cachedProvider: CachedProvider | null = null;
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  constructor() {
    // Only initialize on server side
    if (typeof window !== "undefined") {
      logger.warn(
        "[Cerebras Balancer] Attempted to initialize on client side - skipping"
      );
      return;
    }

    this.initialize();
  }

  private initialize() {
    try {
      // Initialize Redis
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        this.redis = new Redis({ url: redisUrl, token: redisToken });
        logger.log("[Cerebras Balancer] ✅ Redis client initialized");
      } else {
        logger.warn("[Cerebras Balancer] ⚠️ Missing Redis credentials");
      }

      // Load API keys from environment
      this.keys = Object.keys(process.env)
        .filter((key) => key.startsWith("CEREBRAS_API_KEY"))
        .map((key) => ({
          id: key,
          value: process.env[key] as string,
        }))
        .filter((k) => k.value);

      if (this.keys.length === 0) {
        logger.warn("[Cerebras Balancer] ⚠️ No CEREBRAS_API_KEYs found");
      } else {
        logger.log(`[Cerebras Balancer] ✅ Loaded ${this.keys.length} keys`);
      }
    } catch (error) {
      logger.error("[Cerebras Balancer] ❌ Failed to initialize:", error);
    }
  }

  static getInstance(): CerebrasKeyBalancer {
    if (!CerebrasKeyBalancer.instance) {
      CerebrasKeyBalancer.instance = new CerebrasKeyBalancer();
    }
    return CerebrasKeyBalancer.instance;
  }

  /**
   * Calculate seconds until next UTC midnight
   */
  private getSecondsUntilUTCMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }

  /**
   * Report error to Redis
   */
  private async reportError(
    keyId: string,
    errorType: ErrorType,
    _retryAfter?: number
  ): Promise<void> {
    if (!this.redis) return;

    try {
      const redisPrefix = "cerebras";

      if (errorType === "rate_limit") {
        // ANY rate limit (30 RPM / 900 RPH / 14400 RPD) → disable until UTC midnight
        const ttl = this.getSecondsUntilUTCMidnight();
        const reviveTime = Date.now() + ttl * 1000;

        await this.redis.set(
          `${redisPrefix}:key:health:${keyId}:disabled`,
          reviveTime,
          { ex: ttl }
        );

        logger.log(
          `⚠️ Key ${keyId} hit rate limit - disabling until ${new Date(
            reviveTime
          ).toISOString()}`
        );

        await this.redis.incr(`${redisPrefix}:key:ratelimits:${keyId}`);
      } else if (errorType === "queue_overflow") {
        // Queue overflow → disable for 15 seconds to spread load
        const ttl = 15;
        const reviveTime = Date.now() + ttl * 1000;

        await this.redis.set(
          `${redisPrefix}:key:health:${keyId}:disabled`,
          reviveTime,
          { ex: ttl }
        );

        logger.log(`⏳ Key ${keyId} queue overflow - disabling for 15s`);
        await this.redis.incr(`${redisPrefix}:key:queue_overflows:${keyId}`);
      } else {
        logger.log(`⚠️ Key ${keyId} error: ${errorType}`);
        await this.redis.incr(`${redisPrefix}:key:errors:${keyId}`);
      }
    } catch (error) {
      logger.error("[Cerebras Balancer] ❌ Failed to report error:", error);
    }
  }

  /**
   * Get a load-balanced Cerebras provider
   */
  async getProvider(): Promise<ReturnType<typeof createCerebras>> {
    // Check in-memory cache first
    if (this.cachedProvider && this.cachedProvider.expiresAt > Date.now()) {
      logger.debug("[Cerebras Balancer] 🚀 Using cached provider");
      this.currentKeyId = this.cachedProvider.keyId;
      return this.cachedProvider.provider;
    }

    // Check if we have any keys
    if (this.keys.length === 0) {
      const fallbackKey = process.env.CEREBRAS_API_KEY;
      if (fallbackKey) {
        logger.warn("[Cerebras Balancer] ⚠️ Using fallback key");
        return createCerebras({ apiKey: fallbackKey });
      }
      throw new Error("No Cerebras API keys available");
    }

    const REDIS_KEY_PREFIX_HEALTH = "cerebras:key:health:";
    const now = Date.now();

    try {
      // Local Round Robin Selection with Redis health checks
      if (this.redis) {
        for (let i = 0; i < this.keys.length; i++) {
          const keyIndex = (this.localIndex + i) % this.keys.length;
          const selectedKey = this.keys[keyIndex];

          // Check if key is disabled
          const disabledUntil = await this.redis.get<number>(
            `${REDIS_KEY_PREFIX_HEALTH}${selectedKey.id}:disabled`
          );

          if (disabledUntil && disabledUntil > now) {
            logger.debug(
              `[Cerebras Balancer] Key ${
                selectedKey.id
              } disabled until ${new Date(disabledUntil).toISOString()}`
            );
            continue;
          }

          // Update local index
          this.localIndex = (keyIndex + 1) % this.keys.length;
          this.currentKeyId = selectedKey.id;

          // Track usage stats asynchronously
          Promise.all([
            this.redis.incr(`cerebras:key:usage:${selectedKey.id}`),
            this.redis.set(`cerebras:key:lastused:${selectedKey.id}`, now),
          ]).catch((err) => logger.error("Failed to update usage stats", err));

          logger.log(`[Cerebras Balancer] ✅ Selected key: ${selectedKey.id}`);

          const provider = createCerebras({ apiKey: selectedKey.value });

          // Cache for rapid-fire requests
          this.cachedProvider = {
            provider,
            keyId: selectedKey.id,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
          };

          return provider;
        }

        // All keys disabled - emergency fallback
        logger.error("[Cerebras Balancer] ❌ All keys disabled!");
        this.currentKeyId = this.keys[0].id;
        return createCerebras({ apiKey: this.keys[0].value });
      }
    } catch (error) {
      logger.error("[Cerebras Balancer] ❌ Redis error:", error);
      // Fall through to local rotation
    }

    // Redis unavailable or error - use local round-robin rotation
    logger.warn(
      "[Cerebras Balancer] ⚠️ Using local rotation (Redis unavailable)"
    );
    const keyIndex = this.localIndex % this.keys.length;
    const selectedKey = this.keys[keyIndex];

    this.localIndex = (this.localIndex + 1) % this.keys.length;
    this.currentKeyId = selectedKey.id;

    logger.log(
      `[Cerebras Balancer] ✅ Selected key: ${selectedKey.id} (local rotation)`
    );

    const provider = createCerebras({ apiKey: selectedKey.value });

    // Cache for rapid-fire requests
    this.cachedProvider = {
      provider,
      keyId: selectedKey.id,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };

    return provider;
  }

  /**
   * Handle API errors
   */
  async handleError(error: any): Promise<{
    shouldRetry: boolean;
    waitTime: number;
    shouldRotateKey: boolean;
  }> {
    const classification = classifyCerebrasError(error);
    const keyId = this.currentKeyId || "unknown";

    logger.log(`[Cerebras Balancer] 🔍 Error: ${classification.type}`);

    switch (classification.type) {
      case "rate_limit":
        // True rate limit - mark key dead, rotate immediately
        logger.warn(`[Cerebras Balancer] ⚠️ Rate limit on key ${keyId}`);
        await this.reportError(keyId, "rate_limit");

        return {
          shouldRetry: true,
          waitTime: 0, // Immediate retry with new key
          shouldRotateKey: true,
        };

      case "queue_overflow":
        // Queue overflow - disable key for 15s, rotate immediately
        logger.log(`[Cerebras Balancer] ⏳ Queue overflow on key ${keyId}`);
        await this.reportError(keyId, "queue_overflow");

        return {
          shouldRetry: true,
          waitTime: 0, // Immediate rotation to next key
          shouldRotateKey: true,
        };

      default:
        // Other errors - retry with backoff
        logger.error(`[Cerebras Balancer] ❌ Other error: ${error.message}`);
        await this.reportError(keyId, "other");

        return {
          shouldRetry: true,
          waitTime: 2, // 2 second backoff
          shouldRotateKey: false,
        };
    }
  }

  // Legacy compatibility methods
  getStats(): any[] {
    return [];
  }

  getKeyCount(): number {
    return this.keys.length;
  }
}

export function getCerebrasBalancer(): CerebrasKeyBalancer {
  return CerebrasKeyBalancer.getInstance();
}

export function getBalancedCerebrasProvider(): Promise<
  ReturnType<typeof createCerebras>
> {
  return getCerebrasBalancer().getProvider();
}

// Synchronous provider for agent initialization (uses cached provider)
let _cachedSyncProvider: ReturnType<typeof createCerebras> | null = null;
let _initPromise: Promise<void> | null = null;

export function getBalancedCerebrasProviderSync(): ReturnType<
  typeof createCerebras
> {
  if (_cachedSyncProvider) {
    return _cachedSyncProvider;
  }

  // Fallback to direct provider if not initialized yet
  const fallbackKey = process.env.CEREBRAS_API_KEY;
  if (fallbackKey) {
    _cachedSyncProvider = createCerebras({ apiKey: fallbackKey });

    // Start async initialization in background if not already started
    if (!_initPromise && typeof window === "undefined") {
      _initPromise = getBalancedCerebrasProvider()
        .then((provider) => {
          _cachedSyncProvider = provider;
          logger.log(
            "[Cerebras Balancer] ✅ Sync provider upgraded to balanced"
          );
        })
        .catch((err) => {
          logger.warn(
            "[Cerebras Balancer] ⚠️ Could not upgrade to balanced provider:",
            err
          );
        });
    }

    return _cachedSyncProvider;
  }

  // During build time, return a dummy provider to prevent errors
  // This will never be called at runtime since routes are dynamic
  logger.warn(
    "[Cerebras Balancer] ⚠️ No API key available, returning placeholder provider"
  );
  _cachedSyncProvider = createCerebras({ apiKey: "placeholder-for-build" });
  return _cachedSyncProvider;
}

export function handleCerebrasError(error: any) {
  return getCerebrasBalancer().handleError(error);
}

export function getCerebrasStats() {
  return getCerebrasBalancer().getStats();
}
