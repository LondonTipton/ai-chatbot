/**
 * Test script for Query Queue System
 *
 * Tests queue operations, priority handling, and job processing
 */

import {
  getJobStatus,
  getQueueMetrics,
  queryQueue,
  queryWorker,
  queueEvents,
  queueQuery,
} from "../lib/query-queue";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testQueueSystem() {
  console.log("=".repeat(80));
  console.log("QUERY QUEUE SYSTEM TEST");
  console.log("=".repeat(80));
  console.log();

  try {
    // Test 1: Queue queries with different priorities
    console.log("Test 1: Queueing queries with different priorities");
    console.log("-".repeat(80));

    const autoJobId = await queueQuery(
      "What is the Companies Act in Zimbabwe?",
      "auto",
      "Zimbabwe",
      "test-user-1"
    );
    console.log(`✅ AUTO query queued: ${autoJobId}`);

    const mediumJobId = await queueQuery(
      "Compare contract law in Zimbabwe and South Africa",
      "medium",
      "Zimbabwe",
      "test-user-2"
    );
    console.log(`✅ MEDIUM query queued: ${mediumJobId}`);

    const deepJobId = await queueQuery(
      "Comprehensive analysis of Zimbabwe constitutional law",
      "deep",
      "Zimbabwe",
      "test-user-3"
    );
    console.log(`✅ DEEP query queued: ${deepJobId}`);
    console.log();

    // Test 2: Check queue metrics
    console.log("Test 2: Queue metrics");
    console.log("-".repeat(80));

    const metrics = await getQueueMetrics();
    console.log("📊 Queue metrics:", {
      waiting: metrics.waiting,
      active: metrics.active,
      completed: metrics.completed,
      failed: metrics.failed,
      total: metrics.total,
    });
    console.log();

    // Test 3: Check job status
    console.log("Test 3: Job status tracking");
    console.log("-".repeat(80));

    const autoStatus = await getJobStatus(autoJobId);
    console.log("📋 AUTO job status:", {
      status: autoStatus.status,
      progress: autoStatus.progress,
    });

    const mediumStatus = await getJobStatus(mediumJobId);
    console.log("📋 MEDIUM job status:", {
      status: mediumStatus.status,
      progress: mediumStatus.progress,
    });

    const deepStatus = await getJobStatus(deepJobId);
    console.log("📋 DEEP job status:", {
      status: deepStatus.status,
      progress: deepStatus.progress,
    });
    console.log();

    // Test 4: Monitor job completion
    console.log("Test 4: Monitoring job completion");
    console.log("-".repeat(80));
    console.log("Waiting for jobs to complete (max 60 seconds)...");
    console.log();

    const jobIds = [autoJobId, mediumJobId, deepJobId];
    const maxWaitTime = 60_000; // 60 seconds
    const startTime = Date.now();

    // Set up event listeners
    queueEvents.on("completed", ({ jobId }) => {
      console.log(`✅ Job completed: ${jobId}`);
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.log(`❌ Job failed: ${jobId}`);
      console.log(`   Reason: ${failedReason}`);
    });

    queueEvents.on("progress", ({ jobId, data }) => {
      console.log(`📊 Job progress: ${jobId} - ${data}%`);
    });

    // Poll for completion
    let allCompleted = false;
    while (!allCompleted && Date.now() - startTime < maxWaitTime) {
      await sleep(2000); // Check every 2 seconds

      const statuses = await Promise.all(jobIds.map((id) => getJobStatus(id)));

      allCompleted = statuses.every(
        (s) => s.status === "completed" || s.status === "failed"
      );

      if (!allCompleted) {
        const pending = statuses.filter((s) => s.status === "pending").length;
        const processing = statuses.filter(
          (s) => s.status === "processing"
        ).length;
        const completed = statuses.filter(
          (s) => s.status === "completed"
        ).length;
        const failed = statuses.filter((s) => s.status === "failed").length;

        console.log(
          `   Status: ${pending} pending, ${processing} processing, ${completed} completed, ${failed} failed`
        );
      }
    }

    console.log();

    // Test 5: Check final results
    console.log("Test 5: Final results");
    console.log("-".repeat(80));

    for (const jobId of jobIds) {
      const status = await getJobStatus(jobId);
      console.log(`\nJob ${jobId}:`);
      console.log(`  Status: ${status.status}`);
      console.log(`  Progress: ${status.progress}%`);

      if (status.status === "completed" && status.result) {
        console.log(`  Success: ${status.result.success}`);
        console.log(
          `  Response length: ${status.result.response?.length || 0} chars`
        );
        console.log(`  Cached: ${status.result.metadata?.cached || false}`);
        console.log(`  Steps used: ${status.result.metadata?.stepsUsed || 0}`);
        console.log(
          `  Tools called: ${status.result.metadata?.toolsCalled?.length || 0}`
        );
      } else if (status.status === "failed") {
        console.log(`  Error: ${status.error}`);
      }
    }

    console.log();

    // Test 6: Final queue metrics
    console.log("Test 6: Final queue metrics");
    console.log("-".repeat(80));

    const finalMetrics = await getQueueMetrics();
    console.log("📊 Final queue metrics:", {
      waiting: finalMetrics.waiting,
      active: finalMetrics.active,
      completed: finalMetrics.completed,
      failed: finalMetrics.failed,
      total: finalMetrics.total,
    });
    console.log();

    // Test 7: Test priority ordering
    console.log("Test 7: Priority ordering verification");
    console.log("-".repeat(80));

    const autoJob = await queryQueue.getJob(autoJobId);
    const mediumJob = await queryQueue.getJob(mediumJobId);
    const deepJob = await queryQueue.getJob(deepJobId);

    console.log(`AUTO priority: ${autoJob?.opts.priority} (should be 1)`);
    console.log(`MEDIUM priority: ${mediumJob?.opts.priority} (should be 2)`);
    console.log(`DEEP priority: ${deepJob?.opts.priority} (should be 3)`);

    const priorityCorrect =
      autoJob?.opts.priority === 1 &&
      mediumJob?.opts.priority === 2 &&
      deepJob?.opts.priority === 3;

    console.log(
      priorityCorrect
        ? "✅ Priority ordering is correct"
        : "❌ Priority ordering is incorrect"
    );
    console.log();

    console.log("=".repeat(80));
    console.log("✅ ALL TESTS COMPLETED");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    // Clean up
    console.log("\nCleaning up...");
    await queryWorker.close();
    await queryQueue.close();
    console.log("✅ Cleanup complete");
  }
}

// Run tests
testQueueSystem()
  .then(() => {
    console.log("\n✅ Test script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test script failed:", error);
    process.exit(1);
  });
