/**
 * Unit tests for Query Queue System
 *
 * Tests queue operations, priority handling, job status tracking,
 * error handling, and retry logic.
 *
 * Requirements: 8.1, 8.2, 8.3
 *
 * Note: These tests verify queue configuration and job structure.
 * Full integration tests with actual job processing are in integration tests.
 */

import {
  getJobStatus,
  getQueueMetrics,
  queryQueue,
  queryWorker,
  queueQuery,
} from "@/lib/query-queue";

async function runTests() {
  console.log("=".repeat(80));
  console.log("QUERY QUEUE UNIT TESTS");
  console.log("=".repeat(80));
  console.log();

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
      failed++;
    }
  };

  // Test 1: Queue AUTO query with priority 1
  await test("should queue an AUTO query with priority 1", async () => {
    const jobId = await queueQuery(
      "What is company law in Zimbabwe?",
      "auto",
      "Zimbabwe",
      "test-user-1"
    );

    if (!jobId || typeof jobId !== "string") {
      throw new Error("Job ID should be a string");
    }

    const job = await queryQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.data.mode !== "auto") {
      throw new Error(`Expected mode 'auto', got '${job.data.mode}'`);
    }

    if (job.opts.priority !== 1) {
      throw new Error(`Expected priority 1, got ${job.opts.priority}`);
    }
  });

  // Test 2: Queue MEDIUM query with priority 2
  await test("should queue a MEDIUM query with priority 2", async () => {
    const jobId = await queueQuery(
      "Compare contract law in Zimbabwe and South Africa",
      "medium",
      "Zimbabwe",
      "test-user-2"
    );

    const job = await queryQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.data.mode !== "medium") {
      throw new Error(`Expected mode 'medium', got '${job.data.mode}'`);
    }

    if (job.opts.priority !== 2) {
      throw new Error(`Expected priority 2, got ${job.opts.priority}`);
    }
  });

  // Test 3: Queue DEEP query with priority 3
  await test("should queue a DEEP query with priority 3", async () => {
    const jobId = await queueQuery(
      "Comprehensive analysis of Zimbabwe constitutional law",
      "deep",
      "Zimbabwe",
      "test-user-3"
    );

    const job = await queryQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.data.mode !== "deep") {
      throw new Error(`Expected mode 'deep', got '${job.data.mode}'`);
    }

    if (job.opts.priority !== 3) {
      throw new Error(`Expected priority 3, got ${job.opts.priority}`);
    }
  });

  // Test 4: Include estimated tokens in job data
  await test("should include estimated tokens in job data", async () => {
    const jobId = await queueQuery(
      "Test query",
      "medium",
      "Zimbabwe",
      "test-user-4"
    );

    const job = await queryQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.data.estimatedTokens !== 8000) {
      throw new Error(
        `Expected 8000 tokens for MEDIUM, got ${job.data.estimatedTokens}`
      );
    }
  });

  // Test 5: Generate unique job IDs
  await test("should generate unique job IDs", async () => {
    const jobId1 = await queueQuery("Query 1", "auto", "Zimbabwe", "user-1");
    const jobId2 = await queueQuery("Query 2", "auto", "Zimbabwe", "user-1");

    if (jobId1 === jobId2) {
      throw new Error("Job IDs should be unique");
    }
  });

  // Test 6: Default jurisdiction to Zimbabwe
  await test("should default jurisdiction to Zimbabwe", async () => {
    const jobId = await queueQuery("Test query", "auto");

    const job = await queryQueue.getJob(jobId);
    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.data.jurisdiction !== "Zimbabwe") {
      throw new Error(
        `Expected jurisdiction 'Zimbabwe', got '${job.data.jurisdiction}'`
      );
    }
  });

  // Test 7: Return pending status for newly queued job
  await test("should return pending status for newly queued job", async () => {
    const jobId = await queueQuery(
      "Test query",
      "auto",
      "Zimbabwe",
      "test-user-5"
    );

    const status = await getJobStatus(jobId);
    if (status.status !== "pending") {
      throw new Error(`Expected status 'pending', got '${status.status}'`);
    }

    if (status.progress !== 0) {
      throw new Error(`Expected progress 0, got ${status.progress}`);
    }
  });

  // Test 8: Return unknown status for non-existent job
  await test("should return unknown status for non-existent job", async () => {
    const status = await getJobStatus("non-existent-job-id");
    if (status.status !== "unknown") {
      throw new Error(`Expected status 'unknown', got '${status.status}'`);
    }
  });

  // Test 9: Return queue metrics
  await test("should return queue metrics", async () => {
    const metrics = await getQueueMetrics();

    if (typeof metrics.waiting !== "number") {
      throw new Error("waiting should be a number");
    }

    if (typeof metrics.active !== "number") {
      throw new Error("active should be a number");
    }

    if (typeof metrics.completed !== "number") {
      throw new Error("completed should be a number");
    }

    if (typeof metrics.failed !== "number") {
      throw new Error("failed should be a number");
    }

    if (typeof metrics.total !== "number") {
      throw new Error("total should be a number");
    }

    if (metrics.total !== metrics.waiting + metrics.active) {
      throw new Error("total should equal waiting + active");
    }
  });

  // Test 10: Assign correct priorities to different modes
  await test("should assign correct priorities to different modes", async () => {
    const autoJobId = await queueQuery("Auto query", "auto");
    const mediumJobId = await queueQuery("Medium query", "medium");
    const deepJobId = await queueQuery("Deep query", "deep");

    const autoJob = await queryQueue.getJob(autoJobId);
    const mediumJob = await queryQueue.getJob(mediumJobId);
    const deepJob = await queryQueue.getJob(deepJobId);

    if (!autoJob || !mediumJob || !deepJob) {
      throw new Error("All jobs should exist");
    }

    if (autoJob.opts.priority !== 1) {
      throw new Error(
        `AUTO priority should be 1, got ${autoJob.opts.priority}`
      );
    }

    if (mediumJob.opts.priority !== 2) {
      throw new Error(
        `MEDIUM priority should be 2, got ${mediumJob.opts.priority}`
      );
    }

    if (deepJob.opts.priority !== 3) {
      throw new Error(
        `DEEP priority should be 3, got ${deepJob.opts.priority}`
      );
    }

    if (autoJob.opts.priority >= (mediumJob.opts.priority || 0)) {
      throw new Error("AUTO should have higher priority than MEDIUM");
    }

    if ((mediumJob.opts.priority || 0) >= (deepJob.opts.priority || 0)) {
      throw new Error("MEDIUM should have higher priority than DEEP");
    }
  });

  // Test 11: Configure retry attempts
  await test("should configure retry attempts", async () => {
    const jobId = await queueQuery("Test query", "auto");
    const job = await queryQueue.getJob(jobId);

    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.opts.attempts !== 3) {
      throw new Error(`Expected 3 attempts, got ${job.opts.attempts}`);
    }
  });

  // Test 12: Configure exponential backoff
  await test("should configure exponential backoff", async () => {
    const jobId = await queueQuery("Test query", "auto");
    const job = await queryQueue.getJob(jobId);

    if (!job) {
      throw new Error("Job should exist");
    }

    if (
      !job.opts.backoff ||
      typeof job.opts.backoff !== "object" ||
      job.opts.backoff.type !== "exponential" ||
      job.opts.backoff.delay !== 2000
    ) {
      throw new Error("Backoff should be exponential with 2000ms delay");
    }
  });

  // Test 13: Map token budgets correctly
  await test("should map token budgets correctly", async () => {
    const autoJobId = await queueQuery("Test query", "auto");
    const mediumJobId = await queueQuery("Test query", "medium");
    const deepJobId = await queueQuery("Test query", "deep");

    const autoJob = await queryQueue.getJob(autoJobId);
    const mediumJob = await queryQueue.getJob(mediumJobId);
    const deepJob = await queryQueue.getJob(deepJobId);

    if (!autoJob || !mediumJob || !deepJob) {
      throw new Error("All jobs should exist");
    }

    if (autoJob.data.estimatedTokens !== 2500) {
      throw new Error(
        `AUTO should have 2500 tokens, got ${autoJob.data.estimatedTokens}`
      );
    }

    if (mediumJob.data.estimatedTokens !== 8000) {
      throw new Error(
        `MEDIUM should have 8000 tokens, got ${mediumJob.data.estimatedTokens}`
      );
    }

    if (deepJob.data.estimatedTokens !== 20_000) {
      throw new Error(
        `DEEP should have 20000 tokens, got ${deepJob.data.estimatedTokens}`
      );
    }
  });

  // Test 14: Include all required fields in job data
  await test("should include all required fields in job data", async () => {
    const jobId = await queueQuery(
      "Test query",
      "medium",
      "Zimbabwe",
      "test-user"
    );
    const job = await queryQueue.getJob(jobId);

    if (!job) {
      throw new Error("Job should exist");
    }

    if (!job.data.query) {
      throw new Error("Job data should have query");
    }

    if (!job.data.mode) {
      throw new Error("Job data should have mode");
    }

    if (!job.data.jurisdiction) {
      throw new Error("Job data should have jurisdiction");
    }

    if (!job.data.estimatedTokens) {
      throw new Error("Job data should have estimatedTokens");
    }

    if (job.data.query !== "Test query") {
      throw new Error(`Expected query 'Test query', got '${job.data.query}'`);
    }

    if (job.data.mode !== "medium") {
      throw new Error(`Expected mode 'medium', got '${job.data.mode}'`);
    }

    if (job.data.jurisdiction !== "Zimbabwe") {
      throw new Error(
        `Expected jurisdiction 'Zimbabwe', got '${job.data.jurisdiction}'`
      );
    }

    if (job.data.userId !== "test-user") {
      throw new Error(`Expected userId 'test-user', got '${job.data.userId}'`);
    }
  });

  // Test 15: Handle optional userId
  await test("should handle optional userId", async () => {
    const jobId = await queueQuery("Test query", "auto", "Zimbabwe");
    const job = await queryQueue.getJob(jobId);

    if (!job) {
      throw new Error("Job should exist");
    }

    if (job.data.userId !== undefined) {
      throw new Error("userId should be undefined when not provided");
    }
  });

  // Summary
  console.log();
  console.log("=".repeat(80));
  console.log(`TESTS COMPLETED: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(80));

  // Clean up
  await queryWorker.close();
  await queryQueue.close();

  return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}

export { runTests };
