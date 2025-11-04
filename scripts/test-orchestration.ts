/**
 * Test Dual-Agent Orchestration Integration
 *
 * This script demonstrates the orchestration pattern in action
 */

import { orchestrateResearch } from "../lib/ai/agent-orchestrator";

async function testOrchestration() {
  console.log("=".repeat(80));
  console.log("🧪 TESTING DUAL-AGENT ORCHESTRATION");
  console.log("=".repeat(80));
  console.log();

  const testQuery = "Find recent Zimbabwe labor law changes";

  console.log(`📝 Query: "${testQuery}"`);
  console.log(
    "🎯 Expected: Task agent searches → Synthesizer creates text response"
  );
  console.log();

  try {
    const startTime = Date.now();

    console.log("🚀 Starting orchestration...");
    const result = await orchestrateResearch(testQuery, {
      userId: "test-user-123",
    });

    const totalTime = Date.now() - startTime;

    console.log();
    console.log("=".repeat(80));
    console.log("📊 ORCHESTRATION RESULTS");
    console.log("=".repeat(80));
    console.log();

    console.log("✅ Task Agent:");
    console.log(`   - Success: ${result.metadata.taskSuccess}`);
    console.log(`   - Duration: ${result.metadata.taskDuration}ms`);
    console.log(`   - Agent: ${result.metadata.taskAgent}`);
    console.log();

    console.log("✅ Synthesizer Agent:");
    console.log(`   - Success: ${result.metadata.synthesisSuccess}`);
    console.log(`   - Duration: ${result.metadata.synthesisDuration}ms`);
    console.log();

    console.log("📈 Summary:");
    console.log(`   - Total Duration: ${totalTime}ms`);
    console.log(
      `   - Response Length: ${result.synthesizedResponse.length} chars`
    );
    console.log(
      `   - Both Succeeded: ${
        result.metadata.taskSuccess && result.metadata.synthesisSuccess
      }`
    );
    console.log();

    if (result.synthesizedResponse.length > 0) {
      console.log("📝 Response Preview:");
      console.log(`   "${result.synthesizedResponse.substring(0, 200)}..."`);
      console.log();
    }

    // Validate response quality
    const isValid =
      result.metadata.taskSuccess &&
      result.metadata.synthesisSuccess &&
      result.synthesizedResponse.length >= 50 &&
      result.synthesizedResponse.trim().length > 0;

    if (isValid) {
      console.log(
        "🎉 TEST PASSED: Orchestration produced valid text response!"
      );
    } else {
      console.log("❌ TEST FAILED: Response validation failed");
      console.log(`   - Task Success: ${result.metadata.taskSuccess}`);
      console.log(
        `   - Synthesis Success: ${result.metadata.synthesisSuccess}`
      );
      console.log(`   - Response Length: ${result.synthesizedResponse.length}`);
    }
  } catch (error) {
    console.error();
    console.error("❌ TEST FAILED: Orchestration threw exception");
    console.error(
      `   Error: ${error instanceof Error ? error.message : String(error)}`
    );
    if (error instanceof Error && error.stack) {
      console.error(`   Stack: ${error.stack.substring(0, 300)}...`);
    }
  }

  console.log();
  console.log("=".repeat(80));
}

// Run the test
testOrchestration()
  .then(() => {
    console.log("✅ Test execution complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
