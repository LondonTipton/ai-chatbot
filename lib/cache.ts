import crypto from "node:crypto";
import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = Redis.fromEnv();

/**
 * Cache Entry
 * Structure of cached query responses
 */
export type CacheEntry = {
  response: string;
  metadata: {
    mode: string;
    stepsUsed?: number;
    toolsCalled?: string[];
    tokenEstimate?: number;
  };
  timestamp: number;
};

/**
 * Generate cache key using MD5 hash
 *
 * @param query - The search query
 * @param mode - Research mode (auto, medium, deep)
 * @param jurisdiction - Legal jurisdiction (default: Zimbabwe)
 * @returns Cache key string
 */
export function generateCacheKey(
  query: string,
  mode: string,
  jurisdiction: string
): string {
  // Normalize query (lowercase, trim whitespace)
  const normalized = query.toLowerCase().trim();

  // Create hash of query + mode + jurisdiction
  const hash = crypto
    .createHash("md5")
    .update(`${normalized}:${mode}:${jurisdiction}`)
    .digest("hex");

  return `query:${mode}:${jurisdiction}:${hash}`;
}

/**
 * Query Cache
 * Redis-based caching for research queries
 */
export class QueryCache {
  private readonly redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * Get cached query response
   *
   * @param query - The search query
   * @param mode - Research mode
   * @param jurisdiction - Legal jurisdiction
   * @returns Cached entry or null if not found
   */
  async get(
    query: string,
    mode: string,
    jurisdiction: string
  ): Promise<CacheEntry | null> {
    try {
      const key = generateCacheKey(query, mode, jurisdiction);
      const cached = await this.redis.get<string>(key);

      if (cached) {
        console.log("[Cache Hit]", {
          query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
          mode,
          jurisdiction,
          key,
        });

        // Parse the cached entry
        const entry: CacheEntry =
          typeof cached === "string" ? JSON.parse(cached) : cached;

        return entry;
      }

      console.log("[Cache Miss]", {
        query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        mode,
        jurisdiction,
        key,
      });

      return null;
    } catch (error) {
      console.error("[Cache Error] Failed to get cached entry", {
        query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        mode,
        jurisdiction,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return null on error to avoid blocking operations
      return null;
    }
  }

  /**
   * Set cached query response
   */
  async set(params: {
    query: string;
    mode: string;
    jurisdiction: string;
    response: string;
    metadata: CacheEntry["metadata"];
    ttl?: number;
  }): Promise<void> {
    const { query, mode, jurisdiction, response, metadata, ttl } = params;

    try {
      const key = generateCacheKey(query, mode, jurisdiction);

      // Create cache entry
      const entry: CacheEntry = {
        response,
        metadata,
        timestamp: Date.now(),
      };

      // Determine TTL based on mode and content
      const effectiveTTL = ttl || this.getDefaultTTL(mode, query);

      // Store in Redis with TTL
      await this.redis.set(key, JSON.stringify(entry), { ex: effectiveTTL });

      console.log("[Cache Set]", {
        query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        mode,
        jurisdiction,
        key,
        ttl: effectiveTTL,
        expiresAt: new Date(Date.now() + effectiveTTL * 1000).toISOString(),
      });
    } catch (error) {
      console.error("[Cache Error] Failed to set cached entry", {
        query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        mode,
        jurisdiction,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error - caching failures shouldn't block operations
    }
  }

  /**
   * Invalidate cached query response
   *
   * @param query - The search query
   * @param mode - Research mode
   * @param jurisdiction - Legal jurisdiction
   */
  async invalidate(
    query: string,
    mode: string,
    jurisdiction: string
  ): Promise<void> {
    try {
      const key = generateCacheKey(query, mode, jurisdiction);
      await this.redis.del(key);

      console.log("[Cache Invalidate]", {
        query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        mode,
        jurisdiction,
        key,
      });
    } catch (error) {
      console.error("[Cache Error] Failed to invalidate cached entry", {
        query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
        mode,
        jurisdiction,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error - invalidation failures shouldn't block operations
    }
  }

  /**
   * Get default TTL based on mode and query content
   *
   * @param mode - Research mode
   * @param query - The search query
   * @returns TTL in seconds
   */
  private getDefaultTTL(mode: string, query: string): number {
    // Check if query is news-related (shorter TTL)
    const newsKeywords = [
      "news",
      "recent",
      "latest",
      "today",
      "yesterday",
      "current",
      "breaking",
      "update",
    ];
    const isNewsQuery = newsKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword)
    );

    if (isNewsQuery) {
      // 15 minutes for news queries
      return 900;
    }

    // Default TTLs by mode
    switch (mode) {
      case "auto":
        return 3600; // 1 hour
      case "medium":
        return 3600; // 1 hour
      case "deep":
        return 7200; // 2 hours (more expensive to regenerate)
      default:
        return 3600; // 1 hour default
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): Promise<{
    totalKeys: number;
    estimatedSize: string;
  } | null> {
    // Note: This requires Redis INFO command which may not be available in all Redis setups
    // This is a best-effort implementation
    console.log("[Cache Stats] Stats retrieval not fully implemented");
    return Promise.resolve(null);
  }
}

/**
 * Default query cache instance
 */
export const queryCache = new QueryCache(redis);

/**
 * Helper function to get cached query
 */
export function getCachedQuery(
  query: string,
  mode: string,
  jurisdiction: string
): Promise<CacheEntry | null> {
  return queryCache.get(query, mode, jurisdiction);
}

/**
 * Helper function to cache query response
 */
export function setCachedQuery(params: {
  query: string;
  mode: string;
  jurisdiction: string;
  response: string;
  metadata: CacheEntry["metadata"];
  ttl?: number;
}): Promise<void> {
  return queryCache.set(params);
}

/**
 * Helper function to invalidate cached query
 */
export function invalidateCachedQuery(
  query: string,
  mode: string,
  jurisdiction: string
): Promise<void> {
  return queryCache.invalidate(query, mode, jurisdiction);
}
