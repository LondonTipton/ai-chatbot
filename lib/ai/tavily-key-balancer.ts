/**
 * Tavily API Key Load Balancer
 * Simple round-robin load balancing for Tavily API keys
 */

import { Redis } from "@upstash/redis";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/tavily-key-balancer");

class TavilyKeyBalancer {
  private static instance: TavilyKeyBalancer;
  private redis: Redis | undefined;
  private keys: { id: string; value: string }[] = [];
  private localIndex = 0;
  private currentKeyId: string | null = null;

  constructor() {
    // Only initialize on server side
    if (typeof window !== "undefined") {
      logger.warn(
        "[Tavily Balancer] Attempted to initialize on client side - skipping"
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
        logger.log("[Tavily Balancer] ✅ Redis client initialized");
      } else {
        logger.warn("[Tavily Balancer] ⚠️ Missing Redis credentials");
      }

      // Load API keys from environment (only numbered keys like TAVILY_API_KEY_1, etc.)
      this.keys = Object.keys(process.env)
        .filter((key) => key.startsWith("TAVILY_API_KEY") && key !== "TAVILY_API_KEY")
        .map((key) => ({
          id: key,
          value: process.env[key] as string,
        }))
        .filter((k) => k.value);

      if (this.keys.length === 0) {
        logger.warn("[Tavily Balancer] ⚠️ No TAVILY_API_KEYs found");
      } else {
        logger.log(`[Tavily Balancer] ✅ Loaded ${this.keys.length} keys`);
      }
    } catch (error) {
      logger.error("[Tavily Balancer] ❌ Failed to initialize:", error);
    }
  }

  static getInstance(): TavilyKeyBalancer {
    if (!TavilyKeyBalancer.instance) {
      TavilyKeyBalancer.instance = new TavilyKeyBalancer();
    }
    return TavilyKeyBalancer.instance;
  }

  /**
   * Get a load-balanced Tavily API key
   */
  async getApiKey(credits = 1): Promise<string | null> {
    // Check if we have any keys
    if (this.keys.length === 0) {
      const fallbackKey = process.env.TAVILY_API_KEY;
      if (fallbackKey) {
        logger.warn("[Tavily Balancer] ⚠️ Using fallback key");
        return fallbackKey;
      }
      logger.error("[Tavily Balancer] ❌ No Tavily API keys available");
      return null;
    }

    const REDIS_KEY_PREFIX_HEALTH = "tavily:key:health:";
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
              `[Tavily Balancer] Key ${
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
            this.redis.incr(`tavily:key:usage:${selectedKey.id}`),
            this.redis.incrby(`tavily:key:credits:${selectedKey.id}`, credits),
            this.redis.set(`tavily:key:lastused:${selectedKey.id}`, now),
          ]).catch((err) => logger.error("Failed to update usage stats", err));

          logger.log(`[Tavily Balancer] ✅ Selected key: ${selectedKey.id}`);
          return selectedKey.value;
        }

        // All keys disabled - emergency fallback
        logger.error("[Tavily Balancer] ❌ All keys disabled!");
        this.currentKeyId = this.keys[0].id;
        return this.keys[0].value;
      }
    } catch (error) {
      logger.error("[Tavily Balancer] ❌ Redis error:", error);
      // Fall through to local rotation
    }

    // Redis unavailable or error - use local round-robin rotation
    logger.warn(
      "[Tavily Balancer] ⚠️ Using local rotation (Redis unavailable)"
    );
    const keyIndex = this.localIndex % this.keys.length;
    const selectedKey = this.keys[keyIndex];

    this.localIndex = (this.localIndex + 1) % this.keys.length;
    this.currentKeyId = selectedKey.id;

    logger.log(
      `[Tavily Balancer] ✅ Selected key: ${selectedKey.id} (local rotation)`
    );
    return selectedKey.value;
  }

  /**
   * Report error to Redis
   */
  async reportError(keyId: string, errorType: string): Promise<void> {
    if (!this.redis) return;

    try {
      const redisPrefix = "tavily";

      if (errorType === "rate_limit") {
        // Disable key for 1 hour
        const ttl = 3600;
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
      } else {
        logger.log(`⚠️ Key ${keyId} error: ${errorType}`);
        await this.redis.incr(`${redisPrefix}:key:errors:${keyId}`);
      }
    } catch (error) {
      logger.error("[Tavily Balancer] ❌ Failed to report error:", error);
    }
  }

  getKeyCount(): number {
    return this.keys.length;
  }
}

export function getTavilyBalancer(): TavilyKeyBalancer {
  return TavilyKeyBalancer.getInstance();
}
