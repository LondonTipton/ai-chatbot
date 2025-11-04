import { createLogger } from "@/lib/logger";

const logger = createLogger("db/usage-cache");

/**
 * Query Cache for Usage Transaction System
 *
 * Provides in-memory caching for user limit queries to reduce database load.
 * Cache entries expire after a configurable TTL (default: 5 seconds).
 */

import "server-only";

export type CachedUserLimit = {
  userId: string;
  dailyLimit: number;
  requestsToday: number;
  lastReset: Date;
  plan: string;
  cachedAt: Date;
};

type CacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
};

/**
 * In-memory cache for user limits
 */
class UsageCache {
  private readonly cache: Map<string, CachedUserLimit>;
  private readonly stats: CacheStats;
  private readonly ttlMs: number;
  private readonly maxSize: number;
  private cleanupIntervalId: NodeJS.Timeout | null;

  constructor(ttlMs = 5000, maxSize = 10_000) {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.cleanupIntervalId = null;
    this.startCleanupInterval();
  }

  /**
   * Get cached user limit
   */
  get(userId: string): CachedUserLimit | null {
    const cached = this.cache.get(userId);

    if (!cached) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.cachedAt.getTime();
    if (age > this.ttlMs) {
      this.cache.delete(userId);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    return cached;
  }

  /**
   * Set cached user limit
   */
  set(userId: string, data: Omit<CachedUserLimit, "cachedAt">): void {
    // Enforce max size with LRU eviction
    if (this.cache.size >= this.maxSize && !this.cache.has(userId)) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(userId, {
      ...data,
      cachedAt: new Date(),
    });

    this.stats.size = this.cache.size;
  }

  /**
   * Invalidate cache entry for a user
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
    this.stats.size = this.cache.size;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [userId, cached] of this.cache.entries()) {
      const age = now - cached.cachedAt.getTime();
      if (age > this.ttlMs) {
        toDelete.push(userId);
      }
    }

    for (const userId of toDelete) {
      this.cache.delete(userId);
      this.stats.evictions++;
    }

    this.stats.size = this.cache.size;

    if (toDelete.length > 0) {
      logger.log(`[UsageCache] Cleaned up ${toDelete.length} expired entries`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      return;
    }

    // Run cleanup every 30 seconds
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, 30_000);

    // Ensure cleanup stops on process exit
    if (typeof process !== "undefined") {
      process.on("beforeExit", () => {
        if (this.cleanupIntervalId) {
          clearInterval(this.cleanupIntervalId);
          this.cleanupIntervalId = null;
        }
      });
    }
  }

  /**
   * Stop cleanup interval (for testing)
   */
  stopCleanupInterval(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
}

/**
 * Global cache instance
 * TTL: 5 seconds (balances freshness with cache effectiveness)
 * Max size: 10,000 entries (prevents unbounded memory growth)
 */
export const usageCache = new UsageCache(5000, 10_000);

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): CacheStats & { hitRate: number } {
  return {
    ...usageCache.getStats(),
    hitRate: usageCache.getHitRate(),
  };
}

/**
 * Clear cache (for testing or manual invalidation)
 */
export function clearCache(): void {
  usageCache.clear();
}
