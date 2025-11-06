/**
 * Performance and Load Tests for Hybrid Agent + Workflow Architecture
 *
 * Tests production capacity validation with:
 * - 350 queries over simulated 24-hour period
 * - Rate limit compliance (no violations)
 * - Cache hit rate ≥20%
 * - Query success rate ≥95%
 * - Zero crashes from tool overuse or rate limit violations
 * - Queue behavior under burst load (50+ concurrent queries)
 * - Latency targets for each mode under load
 *
 * Requirements: 4.1, 4.2, 4.3, 5.4, 8.1, 8.2, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { expect, test } from "@playwright/test";

/**
 * Test configuration
 */
const CONFIG = {
  // API endpoint
  apiUrl: "http://localhost:3000/api/research",

  // Load test parameters
  totalQueries: 350, // Target daily capacity
  simulatedHours: 24, // Simulate 24-hour period
  burstSize: 50, // Number of concurrent queries for burst test

  // Performance targets
  targets: {
    cacheHitRate: 0.2, // ≥20%
    successRate: 0.95, // ≥95%
    crashCount: 0, // Zero crashes

    // Latency targets (milliseconds)
    latency: {
      auto: { min: 1000, max: 15_000 }, // 1-10s target, 15s max acceptable
      medium: { min: 10_000, max: 30_000 }, // 10-20s target, 30s max acceptable
      deep: { min: 25_000, max: 60_000 }, // 25-47s target, 60s max acceptable
    },
  },

  // Query distribution by mode
  modeDistribution: {
    auto: 0.5, // 50% AUTO queries
    medium: 0.3, // 30% MEDIUM queries
    deep: 0.2, // 20% DEEP queries
  },
};

/**
 * Test queries for realistic load patterns
 * Mix of simple, moderate, and complex queries
 */
const TEST_QUERIES = {
  auto: [
    "What is a contract in Zimbabwe law?",
    "Define tort in legal terms",
    "What is the legal age of majority in Zimbabwe?",
    "Explain the concept of consideration in contracts",
    "What is the difference between civil and criminal law?",
    "Define negligence in tort law",
    "What is the statute of limitations?",
    "Explain the doctrine of precedent",
    "What is a legal person?",
    "Define breach of contract",
  ],
  medium: [
    "Compare contract law in Zimbabwe and South Africa",
    "What are the key provisions of Zimbabwe's Labour Act?",
    "Explain the process of company incorporation in Zimbabwe",
    "What are the requirements for a valid will in Zimbabwe?",
    "Analyze the constitutional framework for property rights",
    "What are the remedies for breach of contract in Zimbabwe?",
    "Explain the employment termination process in Zimbabwe",
    "What are the tax implications of company registration?",
    "Describe the legal framework for intellectual property",
    "What are the requirements for marriage in Zimbabwe?",
  ],
  deep: [
    "Provide a comprehensive analysis of intellectual property protection in Zimbabwe",
    "Analyze the constitutional framework for property rights including recent case law",
    "Comprehensive overview of Zimbabwe's legal system and court structure",
    "Detailed analysis of company law and corporate governance in Zimbabwe",
    "Comprehensive guide to employment law and labor relations in Zimbabwe",
    "In-depth analysis of contract formation and enforcement in Zimbabwe",
    "Comprehensive overview of tort law and civil liability in Zimbabwe",
    "Detailed analysis of constitutional law and human rights in Zimbabwe",
    "Comprehensive guide to family law and succession in Zimbabwe",
    "In-depth analysis of criminal law and procedure in Zimbabwe",
  ],
};

/**
 * Performance metrics tracker
 */
class PerformanceMetrics {
  private readonly queries: Array<{
    mode: string;
    query: string;
    success: boolean;
    cached: boolean;
    latency: number;
    error?: string;
    rateLimitViolation: boolean;
    timestamp: number;
  }> = [];

  private rateLimitViolations = 0;
  private crashes = 0;

  /**
   * Record a query result
   */
  recordQuery(result: {
    mode: string;
    query: string;
    success: boolean;
    cached: boolean;
    latency: number;
    error?: string;
    rateLimitViolation: boolean;
  }): void {
    this.queries.push({
      ...result,
      timestamp: Date.now(),
    });

    if (result.rateLimitViolation) {
      this.rateLimitViolations++;
    }

    if (!result.success && result.error?.includes("crash")) {
      this.crashes++;
    }
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const totalQueries = this.queries.length;
    if (totalQueries === 0) {
      return 0;
    }

    const cacheHits = this.queries.filter((q) => q.cached).length;
    return cacheHits / totalQueries;
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    const totalQueries = this.queries.length;
    if (totalQueries === 0) {
      return 0;
    }

    const successfulQueries = this.queries.filter((q) => q.success).length;
    return successfulQueries / totalQueries;
  }

  /**
   * Get rate limit violations
   */
  getRateLimitViolations(): number {
    return this.rateLimitViolations;
  }

  /**
   * Get crash count
   */
  getCrashCount(): number {
    return this.crashes;
  }

  /**
   * Get latency statistics by mode
   */
  getLatencyStats(mode: string): {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const modeQueries = this.queries
      .filter((q) => q.mode === mode && q.success)
      .map((q) => q.latency)
      .sort((a, b) => a - b);

    if (modeQueries.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sum = modeQueries.reduce((acc, val) => acc + val, 0);
    const avg = sum / modeQueries.length;

    const p50Index = Math.floor(modeQueries.length * 0.5);
    const p95Index = Math.floor(modeQueries.length * 0.95);
    const p99Index = Math.floor(modeQueries.length * 0.99);

    return {
      min: modeQueries[0],
      max: modeQueries.at(-1) || 0,
      avg: Math.round(avg),
      p50: modeQueries[p50Index],
      p95: modeQueries[p95Index],
      p99: modeQueries[p99Index],
    };
  }

  /**
   * Get summary report
   */
  getSummary(): string {
    const totalQueries = this.queries.length;
    const cacheHitRate = this.getCacheHitRate();
    const successRate = this.getSuccessRate();

    const autoStats = this.getLatencyStats("auto");
    const mediumStats = this.getLatencyStats("medium");
    const deepStats = this.getLatencyStats("deep");

    return `
Performance Test Summary
========================

Total Queries: ${totalQueries}
Success Rate: ${(successRate * 100).toFixed(2)}% (target: ≥95%)
Cache Hit Rate: ${(cacheHitRate * 100).toFixed(2)}% (target: ≥20%)
Rate Limit Violations: ${this.rateLimitViolations} (target: 0)
Crashes: ${this.crashes} (target: 0)

Latency Statistics (ms)
-----------------------

AUTO Mode:
  Min: ${autoStats.min}ms
  Max: ${autoStats.max}ms (target: <15000ms)
  Avg: ${autoStats.avg}ms
  P50: ${autoStats.p50}ms
  P95: ${autoStats.p95}ms
  P99: ${autoStats.p99}ms

MEDIUM Mode:
  Min: ${mediumStats.min}ms
  Max: ${mediumStats.max}ms (target: <30000ms)
  Avg: ${mediumStats.avg}ms
  P50: ${mediumStats.p50}ms
  P95: ${mediumStats.p95}ms
  P99: ${mediumStats.p99}ms

DEEP Mode:
  Min: ${deepStats.min}ms
  Max: ${deepStats.max}ms (target: <60000ms)
  Avg: ${deepStats.avg}ms
  P50: ${deepStats.p50}ms
  P95: ${deepStats.p95}ms
  P99: ${deepStats.p99}ms
`;
  }
}

/**
 * Execute a single research query
 */
async function executeQuery(
  mode: "auto" | "medium" | "deep",
  query: string
): Promise<{
  success: boolean;
  cached: boolean;
  latency: number;
  error?: string;
  rateLimitViolation: boolean;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(CONFIG.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        mode,
        jurisdiction: "Zimbabwe",
      }),
    });

    const latency = Date.now() - startTime;
    const data = await response.json();

    // Check for rate limit violation
    const rateLimitViolation =
      response.status === 429 || data.error?.code === "RATE_LIMIT_EXCEEDED";

    return {
      success: response.ok && data.success,
      cached: data.metadata?.cached || false,
      latency,
      error: data.error?.message,
      rateLimitViolation,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      cached: false,
      latency,
      error: error instanceof Error ? error.message : String(error),
      rateLimitViolation: false,
    };
  }
}

/**
 * Select a random query for the given mode
 */
function getRandomQuery(mode: "auto" | "medium" | "deep"): string {
  const queries = TEST_QUERIES[mode];
  return queries[Math.floor(Math.random() * queries.length)];
}

/**
 * Select a random mode based on distribution
 */
function getRandomMode(): "auto" | "medium" | "deep" {
  const rand = Math.random();

  if (rand < CONFIG.modeDistribution.auto) {
    return "auto";
  }
  if (rand < CONFIG.modeDistribution.auto + CONFIG.modeDistribution.medium) {
    return "medium";
  }
  return "deep";
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Test: Sustained load over simulated 24-hour period
 */
test.describe("Performance and Load Tests", () => {
  test.setTimeout(600_000); // 10 minutes timeout for load tests

  test("Sustained load: 350 queries over simulated 24-hour period", async () => {
    const metrics = new PerformanceMetrics();

    console.log("\n🚀 Starting sustained load test...");
    console.log(`Target: ${CONFIG.totalQueries} queries`);
    console.log(`Simulated period: ${CONFIG.simulatedHours} hours\n`);

    // Calculate delay between queries to simulate 24-hour period
    // For testing, we'll compress this significantly
    const delayBetweenQueries = 100; // 100ms between queries for faster testing

    // Execute queries sequentially with delays
    for (let i = 0; i < CONFIG.totalQueries; i++) {
      const mode = getRandomMode();
      const query = getRandomQuery(mode);

      console.log(
        `[${i + 1}/${
          CONFIG.totalQueries
        }] Executing ${mode.toUpperCase()} query...`
      );

      const result = await executeQuery(mode, query);

      metrics.recordQuery({
        mode,
        query,
        ...result,
      });

      // Log progress every 50 queries
      if ((i + 1) % 50 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/${CONFIG.totalQueries} queries`);
        console.log(
          `   Success rate: ${(metrics.getSuccessRate() * 100).toFixed(2)}%`
        );
        console.log(
          `   Cache hit rate: ${(metrics.getCacheHitRate() * 100).toFixed(2)}%`
        );
        console.log(
          `   Rate limit violations: ${metrics.getRateLimitViolations()}\n`
        );
      }

      // Add delay between queries
      if (i < CONFIG.totalQueries - 1) {
        await sleep(delayBetweenQueries);
      }
    }

    // Print summary
    console.log(metrics.getSummary());

    // Verify performance targets
    const successRate = metrics.getSuccessRate();
    const cacheHitRate = metrics.getCacheHitRate();
    const rateLimitViolations = metrics.getRateLimitViolations();
    const crashes = metrics.getCrashCount();

    // Assert success rate ≥95%
    expect(
      successRate,
      `Success rate ${(successRate * 100).toFixed(2)}% is below target ${(
        CONFIG.targets.successRate * 100
      ).toFixed(2)}%`
    ).toBeGreaterThanOrEqual(CONFIG.targets.successRate);

    // Assert cache hit rate ≥20%
    expect(
      cacheHitRate,
      `Cache hit rate ${(cacheHitRate * 100).toFixed(2)}% is below target ${(
        CONFIG.targets.cacheHitRate * 100
      ).toFixed(2)}%`
    ).toBeGreaterThanOrEqual(CONFIG.targets.cacheHitRate);

    // Assert zero rate limit violations
    expect(
      rateLimitViolations,
      `Rate limit violations: ${rateLimitViolations} (expected: 0)`
    ).toBe(CONFIG.targets.crashCount);

    // Assert zero crashes
    expect(crashes, `Crashes: ${crashes} (expected: 0)`).toBe(
      CONFIG.targets.crashCount
    );

    // Verify latency targets for each mode
    const autoStats = metrics.getLatencyStats("auto");
    const mediumStats = metrics.getLatencyStats("medium");
    const deepStats = metrics.getLatencyStats("deep");

    expect(
      autoStats.max,
      `AUTO mode max latency ${autoStats.max}ms exceeds target ${CONFIG.targets.latency.auto.max}ms`
    ).toBeLessThan(CONFIG.targets.latency.auto.max);

    expect(
      mediumStats.max,
      `MEDIUM mode max latency ${mediumStats.max}ms exceeds target ${CONFIG.targets.latency.medium.max}ms`
    ).toBeLessThan(CONFIG.targets.latency.medium.max);

    expect(
      deepStats.max,
      `DEEP mode max latency ${deepStats.max}ms exceeds target ${CONFIG.targets.latency.deep.max}ms`
    ).toBeLessThan(CONFIG.targets.latency.deep.max);
  });

  test("Burst load: 50+ concurrent queries", async () => {
    const metrics = new PerformanceMetrics();

    console.log("\n💥 Starting burst load test...");
    console.log(`Concurrent queries: ${CONFIG.burstSize}\n`);

    // Create array of query promises
    const queryPromises: Promise<void>[] = [];

    for (let i = 0; i < CONFIG.burstSize; i++) {
      const mode = getRandomMode();
      const query = getRandomQuery(mode);

      const promise = executeQuery(mode, query).then((result) => {
        metrics.recordQuery({
          mode,
          query,
          ...result,
        });
      });

      queryPromises.push(promise);
    }

    // Execute all queries concurrently
    const startTime = Date.now();
    await Promise.all(queryPromises);
    const totalTime = Date.now() - startTime;

    console.log(`\n✅ Burst test completed in ${totalTime}ms`);
    console.log(metrics.getSummary());

    // Verify performance targets
    const successRate = metrics.getSuccessRate();
    const rateLimitViolations = metrics.getRateLimitViolations();
    const crashes = metrics.getCrashCount();

    // Assert success rate ≥95%
    expect(
      successRate,
      `Success rate ${(successRate * 100).toFixed(2)}% is below target ${(
        CONFIG.targets.successRate * 100
      ).toFixed(2)}%`
    ).toBeGreaterThanOrEqual(CONFIG.targets.successRate);

    // Assert zero rate limit violations
    expect(
      rateLimitViolations,
      `Rate limit violations: ${rateLimitViolations} (expected: 0)`
    ).toBe(CONFIG.targets.crashCount);

    // Assert zero crashes
    expect(crashes, `Crashes: ${crashes} (expected: 0)`).toBe(
      CONFIG.targets.crashCount
    );
  });

  test("Cache effectiveness: Repeated queries", async () => {
    const metrics = new PerformanceMetrics();

    console.log("\n🔄 Testing cache effectiveness...");

    // Execute same query multiple times to test caching
    const testQuery = "What is a contract in Zimbabwe law?";
    const mode = "auto";
    const repetitions = 10;

    console.log(`Query: "${testQuery}"`);
    console.log(`Mode: ${mode.toUpperCase()}`);
    console.log(`Repetitions: ${repetitions}\n`);

    for (let i = 0; i < repetitions; i++) {
      console.log(`[${i + 1}/${repetitions}] Executing query...`);

      const result = await executeQuery(mode, testQuery);

      metrics.recordQuery({
        mode,
        query: testQuery,
        ...result,
      });

      console.log(
        `   Cached: ${result.cached ? "✅ YES" : "❌ NO"} | Latency: ${
          result.latency
        }ms`
      );

      // Small delay between queries
      await sleep(100);
    }

    const cacheHitRate = metrics.getCacheHitRate();

    console.log(`\n📊 Cache hit rate: ${(cacheHitRate * 100).toFixed(2)}%`);

    // First query should be cache miss, subsequent should be cache hits
    // Expect at least 80% cache hit rate for repeated queries
    expect(
      cacheHitRate,
      `Cache hit rate ${(cacheHitRate * 100).toFixed(
        2
      )}% is below expected 80% for repeated queries`
    ).toBeGreaterThanOrEqual(0.8);
  });

  test("Latency targets: Each mode under load", async () => {
    const metrics = new PerformanceMetrics();

    console.log("\n⏱️  Testing latency targets under load...\n");

    // Test each mode with multiple queries
    const queriesPerMode = 10;

    for (const mode of ["auto", "medium", "deep"] as const) {
      console.log(`Testing ${mode.toUpperCase()} mode...`);

      for (let i = 0; i < queriesPerMode; i++) {
        const query = getRandomQuery(mode);
        const result = await executeQuery(mode, query);

        metrics.recordQuery({
          mode,
          query,
          ...result,
        });

        console.log(
          `  [${i + 1}/${queriesPerMode}] Latency: ${
            result.latency
          }ms | Success: ${result.success ? "✅" : "❌"}`
        );

        await sleep(100);
      }

      console.log();
    }

    console.log(metrics.getSummary());

    // Verify latency targets
    const autoStats = metrics.getLatencyStats("auto");
    const mediumStats = metrics.getLatencyStats("medium");
    const deepStats = metrics.getLatencyStats("deep");

    // AUTO mode: P95 should be under 15s
    expect(
      autoStats.p95,
      `AUTO mode P95 latency ${autoStats.p95}ms exceeds target ${CONFIG.targets.latency.auto.max}ms`
    ).toBeLessThan(CONFIG.targets.latency.auto.max);

    // MEDIUM mode: P95 should be under 30s
    expect(
      mediumStats.p95,
      `MEDIUM mode P95 latency ${mediumStats.p95}ms exceeds target ${CONFIG.targets.latency.medium.max}ms`
    ).toBeLessThan(CONFIG.targets.latency.medium.max);

    // DEEP mode: P95 should be under 60s
    expect(
      deepStats.p95,
      `DEEP mode P95 latency ${deepStats.p95}ms exceeds target ${CONFIG.targets.latency.deep.max}ms`
    ).toBeLessThan(CONFIG.targets.latency.deep.max);
  });

  test("Rate limit compliance: No violations under sustained load", async () => {
    const metrics = new PerformanceMetrics();

    console.log("\n🚦 Testing rate limit compliance...\n");

    // Execute queries at a rate that should respect rate limits
    const queryCount = 100;
    const delayBetweenQueries = 200; // 200ms = 5 queries/second

    for (let i = 0; i < queryCount; i++) {
      const mode = getRandomMode();
      const query = getRandomQuery(mode);

      const result = await executeQuery(mode, query);

      metrics.recordQuery({
        mode,
        query,
        ...result,
      });

      if (result.rateLimitViolation) {
        console.log(`❌ Rate limit violation at query ${i + 1}`);
      }

      if ((i + 1) % 20 === 0) {
        console.log(
          `Progress: ${
            i + 1
          }/${queryCount} | Rate limit violations: ${metrics.getRateLimitViolations()}`
        );
      }

      await sleep(delayBetweenQueries);
    }

    const rateLimitViolations = metrics.getRateLimitViolations();

    console.log(`\n📊 Total rate limit violations: ${rateLimitViolations}`);

    // Assert zero rate limit violations
    expect(
      rateLimitViolations,
      `Rate limit violations: ${rateLimitViolations} (expected: 0)`
    ).toBe(0);
  });

  test("Error handling: Graceful degradation", async () => {
    const metrics = new PerformanceMetrics();

    console.log("\n🛡️  Testing error handling and graceful degradation...\n");

    // Test with various query types including edge cases
    const edgeCaseQueries = [
      { mode: "auto" as const, query: "" }, // Empty query
      { mode: "auto" as const, query: "a" }, // Very short query
      {
        mode: "auto" as const,
        query: "x".repeat(1000),
      }, // Very long query
      { mode: "auto" as const, query: "What is a contract?" }, // Normal query
    ];

    for (const { mode, query } of edgeCaseQueries) {
      console.log(
        `Testing query: "${query.substring(0, 50)}${
          query.length > 50 ? "..." : ""
        }"`
      );

      const result = await executeQuery(mode, query);

      metrics.recordQuery({
        mode,
        query,
        ...result,
      });

      console.log(
        `  Success: ${result.success ? "✅" : "❌"} | Error: ${
          result.error || "None"
        }`
      );

      await sleep(100);
    }

    // System should handle errors gracefully without crashing
    const crashes = metrics.getCrashCount();

    expect(crashes, `System crashed ${crashes} times (expected: 0)`).toBe(0);
  });
});
