/**
 * Tests for Usage Cache
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CachedUserLimit } from "@/lib/db/usage-cache";
import { clearCache, getCacheStats, usageCache } from "@/lib/db/usage-cache";

describe("UsageCache", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  describe("Basic Operations", () => {
    it("should store and retrieve cached data", () => {
      const userId = "test-user-1";
      const data: Omit<CachedUserLimit, "cachedAt"> = {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      };

      usageCache.set(userId, data);
      const cached = usageCache.get(userId);

      expect(cached).toBeDefined();
      expect(cached?.userId).toBe(userId);
      expect(cached?.dailyLimit).toBe(10);
      expect(cached?.requestsToday).toBe(5);
    });

    it("should return null for cache miss", () => {
      const cached = usageCache.get("non-existent-user");
      expect(cached).toBeNull();
    });

    it("should invalidate cache entry", () => {
      const userId = "test-user-2";
      const data: Omit<CachedUserLimit, "cachedAt"> = {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      };

      usageCache.set(userId, data);
      expect(usageCache.get(userId)).toBeDefined();

      usageCache.invalidate(userId);
      expect(usageCache.get(userId)).toBeNull();
    });

    it("should clear all cache entries", () => {
      usageCache.set("user-1", {
        userId: "user-1",
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      usageCache.set("user-2", {
        userId: "user-2",
        dailyLimit: 10,
        requestsToday: 3,
        lastReset: new Date(),
        plan: "Free",
      });

      expect(usageCache.get("user-1")).toBeDefined();
      expect(usageCache.get("user-2")).toBeDefined();

      clearCache();

      expect(usageCache.get("user-1")).toBeNull();
      expect(usageCache.get("user-2")).toBeNull();
    });
  });

  describe("TTL and Expiration", () => {
    it("should expire entries after TTL", async () => {
      // Create cache with 100ms TTL
      const shortTtlCache = new (usageCache.constructor as any)(100, 1000);

      const userId = "test-user-ttl";
      shortTtlCache.set(userId, {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      // Should be cached immediately
      expect(shortTtlCache.get(userId)).toBeDefined();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(shortTtlCache.get(userId)).toBeNull();

      shortTtlCache.stopCleanupInterval();
    });

    it("should not expire entries before TTL", async () => {
      const userId = "test-user-no-expire";
      usageCache.set(userId, {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      // Wait less than TTL (default 5000ms)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be cached
      expect(usageCache.get(userId)).toBeDefined();
    });
  });

  describe("Statistics", () => {
    it("should track cache hits", () => {
      const userId = "test-user-hits";
      usageCache.set(userId, {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      // First access - hit
      usageCache.get(userId);

      const stats = getCacheStats();
      expect(stats.hits).toBe(1);
    });

    it("should track cache misses", () => {
      usageCache.get("non-existent-user");

      const stats = getCacheStats();
      expect(stats.misses).toBeGreaterThan(0);
    });

    it("should calculate hit rate correctly", () => {
      clearCache();

      const userId = "test-user-rate";
      usageCache.set(userId, {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      // 2 hits
      usageCache.get(userId);
      usageCache.get(userId);

      // 1 miss
      usageCache.get("non-existent");

      const stats = getCacheStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });

    it("should track cache size", () => {
      clearCache();

      usageCache.set("user-1", {
        userId: "user-1",
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      usageCache.set("user-2", {
        userId: "user-2",
        dailyLimit: 10,
        requestsToday: 3,
        lastReset: new Date(),
        plan: "Free",
      });

      const stats = getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when max size is reached", () => {
      // Create cache with max size of 2
      const smallCache = new (usageCache.constructor as any)(5000, 2);

      smallCache.set("user-1", {
        userId: "user-1",
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      smallCache.set("user-2", {
        userId: "user-2",
        dailyLimit: 10,
        requestsToday: 3,
        lastReset: new Date(),
        plan: "Free",
      });

      // This should evict user-1
      smallCache.set("user-3", {
        userId: "user-3",
        dailyLimit: 10,
        requestsToday: 7,
        lastReset: new Date(),
        plan: "Free",
      });

      expect(smallCache.get("user-1")).toBeNull();
      expect(smallCache.get("user-2")).toBeDefined();
      expect(smallCache.get("user-3")).toBeDefined();

      smallCache.stopCleanupInterval();
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent reads", () => {
      const userId = "test-user-concurrent";
      usageCache.set(userId, {
        userId,
        dailyLimit: 10,
        requestsToday: 5,
        lastReset: new Date(),
        plan: "Free",
      });

      // Simulate concurrent reads
      const results = Array.from({ length: 10 }, () => usageCache.get(userId));

      // All should return the same cached data
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result?.userId).toBe(userId);
      }
    });

    it("should handle concurrent writes", () => {
      const userId = "test-user-writes";

      // Simulate concurrent writes
      for (let i = 0; i < 10; i++) {
        usageCache.set(userId, {
          userId,
          dailyLimit: 10,
          requestsToday: i,
          lastReset: new Date(),
          plan: "Free",
        });
      }

      // Should have the last written value
      const cached = usageCache.get(userId);
      expect(cached).toBeDefined();
      expect(cached?.requestsToday).toBe(9);
    });
  });
});
