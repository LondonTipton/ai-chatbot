/**
 * Performance Benchmark Script for AI Response Reliability System
 *
 * Measures and reports performance metrics for:
 * - Transaction operations
 * - Validation performance
 * - In-memory transaction store
 * - Cleanup mechanisms
 * - Concurrent request handling
 */

import { RetryManager } from "../lib/ai/retry-manager";
import {
  beginTransaction,
  commitTransaction,
  forceCleanup,
  getActiveTransactions,
  rollbackTransaction,
} from "../lib/db/usage-transaction";
import { validateResponseEnhanced } from "../lib/utils/validate-response";

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  transactionBegin: 100,
  transactionCommit: 150,
  transactionRollback: 150,
  validation: 10,
  cleanup: 50,
};

// Helper to measure execution time
async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

// Helper to measure memory usage
function measureMemory(): number {
  if (typeof process !== "undefined" && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  return 0;
}

// Generate test messages of various sizes
function generateTestMessages(size: "small" | "medium" | "large"): any[] {
  const textSizes = {
    small: 100,
    medium: 1000,
    large: 10_000,
  };

  const textLength = textSizes[size];
  const text = "a".repeat(textLength);

  return [
    {
      role: "user",
      parts: [{ type: "text", text: "Test message" }],
    },
    {
      role: "assistant",
      parts: [{ type: "text", text }],
    },
  ];
}

// Test result tracking
interface TestResult {
  name: string;
  duration: number;
  threshold?: number;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordResult(
  name: string,
  duration: number,
  threshold?: number,
  details?: string
) {
  const passed = threshold ? duration < threshold : true;
  results.push({ name, duration, threshold, passed, details });

  const status = passed ? "✅ PASS" : "❌ FAIL";
  const thresholdInfo = threshold ? ` (threshold: ${threshold}ms)` : "";
  console.log(`${status} ${name}: ${duration.toFixed(2)}ms${thresholdInfo}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Test suites
async function testTransactionOperations() {
  console.log("\n📊 Testing Transaction Operations...\n");

  const testUserId = "perf-test-user-" + Date.now();

  // Test beginTransaction
  const { duration: beginDuration } = await measureTime(() =>
    beginTransaction(testUserId)
  );
  recordResult("beginTransaction", beginDuration, THRESHOLDS.transactionBegin);

  // Test commitTransaction
  const beginResult = await beginTransaction(testUserId + "-commit");
  if (beginResult.allowed && beginResult.transaction) {
    const { duration: commitDuration } = await measureTime(() =>
      commitTransaction(beginResult.transaction!.transactionId)
    );
    recordResult(
      "commitTransaction",
      commitDuration,
      THRESHOLDS.transactionCommit
    );
  }

  // Test rollbackTransaction
  const beginResult2 = await beginTransaction(testUserId + "-rollback");
  if (beginResult2.allowed && beginResult2.transaction) {
    await commitTransaction(beginResult2.transaction.transactionId);
    const { duration: rollbackDuration } = await measureTime(() =>
      rollbackTransaction(beginResult2.transaction!.transactionId)
    );
    recordResult(
      "rollbackTransaction",
      rollbackDuration,
      THRESHOLDS.transactionRollback
    );
  }

  // Test full transaction cycle
  const txStart = performance.now();
  const beginResult3 = await beginTransaction(testUserId + "-cycle");
  if (beginResult3.allowed && beginResult3.transaction) {
    await commitTransaction(beginResult3.transaction.transactionId);
  }
  const txDuration = performance.now() - txStart;
  recordResult("Full transaction cycle", txDuration, 300);
}

async function testValidationPerformance() {
  console.log("\n📊 Testing Validation Performance...\n");

  const sizes: Array<"small" | "medium" | "large"> = [
    "small",
    "medium",
    "large",
  ];

  for (const size of sizes) {
    const messages = generateTestMessages(size);
    const iterations = 1000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      validateResponseEnhanced(messages);
    }
    const duration = performance.now() - start;
    const avgDuration = duration / iterations;

    recordResult(
      `Validation (${size}, ${iterations}x)`,
      avgDuration,
      THRESHOLDS.validation,
      `Total: ${duration.toFixed(2)}ms`
    );
  }
}

async function testMemoryUsage() {
  console.log("\n📊 Testing Memory Usage...\n");

  // Test with 100 transactions
  const memBefore100 = measureMemory();
  const baseUserId100 = "mem-test-100-" + Date.now();

  for (let i = 0; i < 100; i++) {
    await beginTransaction(`${baseUserId100}-${i}`);
  }

  const memAfter100 = measureMemory();
  const memUsed100 = memAfter100 - memBefore100;

  recordResult(
    "Memory usage (100 transactions)",
    memUsed100,
    10,
    `Active: ${getActiveTransactions().length}`
  );

  forceCleanup();

  // Test with 1000 transactions
  const memBefore1000 = measureMemory();
  const baseUserId1000 = "mem-test-1000-" + Date.now();

  for (let i = 0; i < 1000; i++) {
    await beginTransaction(`${baseUserId1000}-${i}`);
  }

  const memAfter1000 = measureMemory();
  const memUsed1000 = memAfter1000 - memBefore1000;

  recordResult(
    "Memory usage (1000 transactions)",
    memUsed1000,
    50,
    `Active: ${getActiveTransactions().length}`
  );

  forceCleanup();
}

async function testCleanupPerformance() {
  console.log("\n📊 Testing Cleanup Performance...\n");

  // Test cleanup with 100 transactions
  const baseUserId100 = "cleanup-test-100-" + Date.now();
  for (let i = 0; i < 100; i++) {
    await beginTransaction(`${baseUserId100}-${i}`);
  }

  const { duration: cleanup100 } = await measureTime(async () => {
    forceCleanup();
  });

  recordResult(
    "Cleanup (100 transactions)",
    cleanup100,
    THRESHOLDS.cleanup,
    "Cleaned: 0 (none expired)"
  );

  // Test cleanup with 1000 transactions
  const baseUserId1000 = "cleanup-test-1000-" + Date.now();
  for (let i = 0; i < 1000; i++) {
    await beginTransaction(`${baseUserId1000}-${i}`);
  }

  const { duration: cleanup1000 } = await measureTime(async () => {
    forceCleanup();
  });

  recordResult(
    "Cleanup (1000 transactions)",
    cleanup1000,
    THRESHOLDS.cleanup * 2,
    "Cleaned: 0 (none expired)"
  );

  forceCleanup();
}

async function testConcurrentRequests() {
  console.log("\n📊 Testing Concurrent Requests...\n");

  const concurrencyLevels = [10, 50, 100];

  for (const level of concurrencyLevels) {
    const baseUserId = `concurrent-test-${level}-` + Date.now();

    const { duration } = await measureTime(async () => {
      const promises = [];
      for (let i = 0; i < level; i++) {
        promises.push(
          (async () => {
            const begin = await beginTransaction(`${baseUserId}-${i}`);
            if (begin.transaction) {
              await commitTransaction(begin.transaction.transactionId);
            }
          })()
        );
      }
      await Promise.all(promises);
    });

    const threshold = level === 10 ? 1000 : level === 50 ? 3000 : 5000;
    recordResult(
      `Concurrent operations (${level})`,
      duration,
      threshold,
      `Avg per op: ${(duration / level).toFixed(2)}ms`
    );
  }
}

async function testRetryManager() {
  console.log("\n📊 Testing RetryManager Performance...\n");

  // Test immediate success
  const manager1 = new RetryManager({ maxRetries: 3 });
  let callCount1 = 0;

  const { duration: duration1 } = await measureTime(async () => {
    await manager1.executeWithRetry(
      async () => {
        callCount1++;
        return { success: true };
      },
      () => ({ isValid: true })
    );
  });

  recordResult(
    "RetryManager (immediate success)",
    duration1,
    100,
    `Calls: ${callCount1}`
  );

  // Test with 2 retries
  const manager2 = new RetryManager({
    maxRetries: 3,
    backoffDelays: [10, 20, 40],
  });
  let callCount2 = 0;

  const { duration: duration2 } = await measureTime(async () => {
    await manager2.executeWithRetry(
      async () => {
        callCount2++;
        return { success: callCount2 >= 3 };
      },
      (result) => ({ isValid: result.success })
    );
  });

  recordResult(
    "RetryManager (2 retries)",
    duration2,
    200,
    `Calls: ${callCount2}`
  );

  // Test all failures
  const manager3 = new RetryManager({
    maxRetries: 3,
    backoffDelays: [10, 20, 40],
    enableFallback: false,
  });
  let callCount3 = 0;

  const { duration: duration3 } = await measureTime(async () => {
    await manager3.executeWithRetry(
      async () => {
        callCount3++;
        return { success: false };
      },
      () => ({ isValid: false, reason: "Test failure" })
    );
  });

  recordResult(
    "RetryManager (all failures)",
    duration3,
    300,
    `Calls: ${callCount3}`
  );
}

async function testEndToEnd() {
  console.log("\n📊 Testing End-to-End Scenarios...\n");

  const manager = new RetryManager({
    maxRetries: 2,
    backoffDelays: [10, 20],
  });
  const userId = "e2e-test-user-" + Date.now();
  let attemptCount = 0;

  const { duration } = await measureTime(async () => {
    const beginResult = await beginTransaction(userId);

    if (beginResult.allowed && beginResult.transaction) {
      const retryResult = await manager.executeWithRetry(
        async () => {
          attemptCount++;
          return generateTestMessages("medium");
        },
        (messages) => {
          const validation = validateResponseEnhanced(messages);
          return {
            isValid: validation.isValid,
            reason: validation.reason,
            metrics: validation.metrics,
          };
        }
      );

      if (retryResult.success) {
        await commitTransaction(beginResult.transaction.transactionId);
      } else {
        await rollbackTransaction(beginResult.transaction.transactionId);
      }
    }
  });

  recordResult(
    "Complete retry flow",
    duration,
    500,
    `Attempts: ${attemptCount}`
  );
}

// Print summary
function printSummary() {
  console.log("\n" + "=".repeat(80));
  console.log("📈 PERFORMANCE BENCHMARK SUMMARY");
  console.log("=".repeat(80) + "\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log("Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(
          `  ❌ ${r.name}: ${r.duration.toFixed(2)}ms (threshold: ${
            r.threshold
          }ms)`
        );
      });
    console.log();
  }

  // Performance insights
  console.log("Performance Insights:");

  const avgTransactionTime =
    results
      .filter((r) => r.name.includes("transaction"))
      .reduce((sum, r) => sum + r.duration, 0) /
    results.filter((r) => r.name.includes("transaction")).length;

  console.log(
    `  • Average transaction operation: ${avgTransactionTime.toFixed(2)}ms`
  );

  const validationResult = results.find((r) =>
    r.name.includes("Validation (medium")
  );
  if (validationResult) {
    console.log(
      `  • Validation throughput: ${(1000 / validationResult.duration).toFixed(
        0
      )} validations/sec`
    );
  }

  const memResult = results.find((r) => r.name.includes("Memory usage (1000"));
  if (memResult) {
    console.log(
      `  • Memory per transaction: ${(memResult.duration / 1000).toFixed(3)}MB`
    );
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

// Main execution
async function main() {
  console.log("🚀 Starting Performance Benchmark...\n");
  console.log(
    "This will measure the performance of the retry system components."
  );
  console.log("Please wait, this may take a few minutes...\n");

  try {
    await testTransactionOperations();
    await testValidationPerformance();
    await testMemoryUsage();
    await testCleanupPerformance();
    await testConcurrentRequests();
    await testRetryManager();
    await testEndToEnd();

    printSummary();

    // Exit with appropriate code
    const failed = results.filter((r) => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Benchmark failed with error:", error);
    process.exit(1);
  }
}

main();
