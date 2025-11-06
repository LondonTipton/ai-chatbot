import { expect, test } from "@playwright/test";
import { Redis } from "@upstash/redis";
import { type CacheEntry, generateCacheKey, QueryCache } from "@/lib/cache";

test.describe("Cache", () => {
  test.describe("generateCacheKey", () => {
    test("should generate consistent cache keys for same inputs", () => {
      const query = "What is the legal age in Zimbabwe?";
      const mode = "auto";
      const jurisdiction = "Zimbabwe";

      const key1 = generateCacheKey(query, mode, jurisdiction);
      const key2 = generateCacheKey(query, mode, jurisdiction);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^query:auto:Zimbabwe:[a-f0-9]{32}$/);
    });

    test("should generate different keys for different queries", () => {
      const query1 = "What is the legal age in Zimbabwe?";
      const query2 = "What is the voting age in Zimbabwe?";
      const mode = "auto";
      const jurisdiction = "Zimbabwe";

      const key1 = generateCacheKey(query1, mode, jurisdiction);
      const key2 = generateCacheKey(query2, mode, jurisdiction);

      expect(key1).not.toBe(key2);
    });

    test("should generate different keys for different modes", () => {
      const query = "What is the legal age in Zimbabwe?";
      const jurisdiction = "Zimbabwe";

      const key1 = generateCacheKey(query, "auto", jurisdiction);
      const key2 = generateCacheKey(query, "medium", jurisdiction);
      const key3 = generateCacheKey(query, "deep", jurisdiction);

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    test("should generate different keys for different jurisdictions", () => {
      const query = "What is the legal age?";
      const mode = "auto";

      const key1 = generateCacheKey(query, mode, "Zimbabwe");
      const key2 = generateCacheKey(query, mode, "South Africa");

      expect(key1).not.toBe(key2);
    });

    test("should normalize queries (case-insensitive, trimmed)", () => {
      const mode = "auto";
      const jurisdiction = "Zimbabwe";

      const key1 = generateCacheKey(
        "What is the legal age?",
        mode,
        jurisdiction
      );
      const key2 = generateCacheKey(
        "WHAT IS THE LEGAL AGE?",
        mode,
        jurisdiction
      );
      const key3 = generateCacheKey(
        "  what is the legal age?  ",
        mode,
        jurisdiction
      );

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
    });
  });

  test.describe("QueryCache", () => {
    const testQuery = "What is the legal age in Zimbabwe?";
    const testMode = "auto";
    const testJurisdiction = "Zimbabwe";
    const testResponse = "The legal age in Zimbabwe is 18 years.";
    const testMetadata = {
      mode: "auto",
      stepsUsed: 2,
      toolsCalled: ["qna"],
      tokenEstimate: 150,
    };

    let cache: QueryCache;
    let redis: Redis;

    test.beforeEach(() => {
      redis = Redis.fromEnv();
      cache = new QueryCache(redis);
    });

    test("should return null for cache miss", async () => {
      const uniqueQuery = `Test query ${Date.now()}`;
      const result = await cache.get(uniqueQuery, testMode, testJurisdiction);

      expect(result).toBeNull();
    });

    test("should cache and retrieve query responses", async () => {
      const uniqueQuery = `Test query ${Date.now()}`;

      // Set cache
      await cache.set({
        query: uniqueQuery,
        mode: testMode,
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
        ttl: 60, // 1 minute TTL for test
      });

      // Get cache
      const result = await cache.get(uniqueQuery, testMode, testJurisdiction);

      expect(result).not.toBeNull();
      expect(result?.response).toBe(testResponse);
      expect(result?.metadata.mode).toBe(testMode);
      expect(result?.metadata.stepsUsed).toBe(2);
      expect(result?.metadata.toolsCalled).toEqual(["qna"]);
      expect(result?.timestamp).toBeGreaterThan(0);
    });

    test("should invalidate cached entries", async () => {
      const uniqueQuery = `Test query ${Date.now()}`;

      // Set cache
      await cache.set({
        query: uniqueQuery,
        mode: testMode,
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
        ttl: 60,
      });

      // Verify it's cached
      let result = await cache.get(uniqueQuery, testMode, testJurisdiction);
      expect(result).not.toBeNull();

      // Invalidate
      await cache.invalidate(uniqueQuery, testMode, testJurisdiction);

      // Verify it's gone
      result = await cache.get(uniqueQuery, testMode, testJurisdiction);
      expect(result).toBeNull();
    });

    test("should use default TTL for general queries", async () => {
      const uniqueQuery = `General query ${Date.now()}`;

      // Set cache without explicit TTL
      await cache.set({
        query: uniqueQuery,
        mode: "auto",
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
      });

      // Should be cached
      const result = await cache.get(uniqueQuery, "auto", testJurisdiction);
      expect(result).not.toBeNull();
    });

    test("should use shorter TTL for news queries", async () => {
      const newsQuery = `Latest news about Zimbabwe law ${Date.now()}`;

      // Set cache without explicit TTL (should detect news keywords)
      await cache.set({
        query: newsQuery,
        mode: testMode,
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
      });

      // Should be cached
      const result = await cache.get(newsQuery, testMode, testJurisdiction);
      expect(result).not.toBeNull();
    });

    test("should handle different modes with different TTLs", async () => {
      const uniqueQuery = `Mode test ${Date.now()}`;

      // Test auto mode (1 hour)
      await cache.set({
        query: uniqueQuery,
        mode: "auto",
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
      });
      let result = await cache.get(uniqueQuery, "auto", testJurisdiction);
      expect(result).not.toBeNull();

      // Test medium mode (1 hour)
      await cache.set({
        query: uniqueQuery,
        mode: "medium",
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
      });
      result = await cache.get(uniqueQuery, "medium", testJurisdiction);
      expect(result).not.toBeNull();

      // Test deep mode (2 hours)
      await cache.set({
        query: uniqueQuery,
        mode: "deep",
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
      });
      result = await cache.get(uniqueQuery, "deep", testJurisdiction);
      expect(result).not.toBeNull();
    });

    test("should handle long queries gracefully", async () => {
      const longQuery = "A".repeat(1000) + Date.now();

      await cache.set({
        query: longQuery,
        mode: testMode,
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
        ttl: 60,
      });

      const result = await cache.get(longQuery, testMode, testJurisdiction);
      expect(result).not.toBeNull();
      expect(result?.response).toBe(testResponse);
    });

    test("should handle special characters in queries", async () => {
      const specialQuery = `What is the law on "contracts" & agreements? ${Date.now()}`;

      await cache.set({
        query: specialQuery,
        mode: testMode,
        jurisdiction: testJurisdiction,
        response: testResponse,
        metadata: testMetadata,
        ttl: 60,
      });

      const result = await cache.get(specialQuery, testMode, testJurisdiction);
      expect(result).not.toBeNull();
      expect(result?.response).toBe(testResponse);
    });
  });
});
