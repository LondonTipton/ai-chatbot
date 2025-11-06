/**
 * Test script for Advanced Search Workflow Tool Integration
 *
 * This script performs automated checks to verify the workflow tool
 * integration is working correctly before manual testing.
 */

import { chatAgent } from "@/mastra/agents/chat-agent";
import { advancedSearchWorkflow } from "@/mastra/workflows/advanced-search-workflow";

async function testWorkflowToolRegistration() {
  console.log("\n=== Test 1: Workflow Tool Registration ===");

  try {
    const tools = chatAgent.tools;
    const hasWorkflowTool = "advancedSearchWorkflow" in tools;

    if (hasWorkflowTool) {
      console.log("✅ Advanced Search Workflow tool is registered");
      console.log("   Tool ID:", tools.advancedSearchWorkflow.id);
      console.log(
        "   Tool description:",
        tools.advancedSearchWorkflow.description
      );
      return true;
    } else {
      console.log("❌ Advanced Search Workflow tool is NOT registered");
      console.log("   Available tools:", Object.keys(tools));
      return false;
    }
  } catch (error) {
    console.error("❌ Error checking tool registration:", error);
    return false;
  }
}

async function testWorkflowExecution() {
  console.log("\n=== Test 2: Workflow Execution ===");

  try {
    console.log("Creating workflow run...");
    const run = await advancedSearchWorkflow.createRunAsync();

    console.log("Starting workflow with test query...");
    const startTime = Date.now();

    const result = await run.start({
      inputData: {
        query: "contract law basics",
        jurisdiction: "Zimbabwe",
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.status === "success") {
      console.log("✅ Workflow executed successfully");
      console.log(`   Duration: ${duration}s`);
      console.log("   Steps completed:", Object.keys(result.steps).length);

      const synthesizeStep = result.steps.synthesize;
      if (synthesizeStep?.output) {
        console.log(
          "   Response length:",
          synthesizeStep.output.response?.length || 0
        );
        console.log(
          "   Sources count:",
          synthesizeStep.output.sources?.length || 0
        );
        console.log("   Total tokens:", synthesizeStep.output.totalTokens || 0);

        // Verify token usage is within range
        const tokens = synthesizeStep.output.totalTokens || 0;
        if (tokens >= 3000 && tokens <= 10000) {
          console.log("✅ Token usage within acceptable range (3K-10K)");
        } else {
          console.log(`⚠️  Token usage outside expected range: ${tokens}`);
        }
      }

      return true;
    } else {
      console.log("❌ Workflow failed with status:", result.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Error executing workflow:", error);
    return false;
  }
}

async function testChatAgentWithWorkflowTool() {
  console.log("\n=== Test 3: Chat Agent with Workflow Tool ===");

  try {
    console.log("Testing Chat Agent tool invocation...");

    // This test verifies the agent has the tool available
    // Actual invocation testing should be done through the API
    const tools = chatAgent.tools;
    const workflowTool = tools.advancedSearchWorkflow;

    if (!workflowTool) {
      console.log("❌ Workflow tool not available to Chat Agent");
      return false;
    }

    console.log("✅ Chat Agent has access to workflow tool");
    console.log("   Tool can be invoked by agent");

    // Check agent instructions mention the tool
    const instructions = chatAgent.instructions || "";
    const mentionsWorkflow =
      instructions.toLowerCase().includes("advancedsearchworkflow") ||
      instructions.toLowerCase().includes("advanced search") ||
      instructions.toLowerCase().includes("research");

    if (mentionsWorkflow) {
      console.log(
        "✅ Agent instructions reference research/workflow capability"
      );
    } else {
      console.log(
        "⚠️  Agent instructions may not clearly guide workflow usage"
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Error testing Chat Agent:", error);
    return false;
  }
}

async function testToolInputOutputSchema() {
  console.log("\n=== Test 4: Tool Input/Output Schema ===");

  try {
    const tools = chatAgent.tools;
    const workflowTool = tools.advancedSearchWorkflow;

    if (!workflowTool) {
      console.log("❌ Workflow tool not found");
      return false;
    }

    // Check input schema
    console.log("Checking input schema...");
    const inputSchema = workflowTool.inputSchema;
    if (inputSchema) {
      console.log("✅ Input schema defined");
      console.log("   Schema type:", inputSchema._def?.typeName);
    } else {
      console.log("❌ Input schema missing");
      return false;
    }

    // Check output schema
    console.log("Checking output schema...");
    const outputSchema = workflowTool.outputSchema;
    if (outputSchema) {
      console.log("✅ Output schema defined");
      console.log("   Schema type:", outputSchema._def?.typeName);
    } else {
      console.log("❌ Output schema missing");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking schemas:", error);
    return false;
  }
}

async function runAllTests() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Advanced Search Workflow Tool Integration Test Suite     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const results = {
    toolRegistration: false,
    workflowExecution: false,
    chatAgentIntegration: false,
    schemaValidation: false,
  };

  // Run tests
  results.toolRegistration = await testWorkflowToolRegistration();
  results.schemaValidation = await testToolInputOutputSchema();
  results.chatAgentIntegration = await testChatAgentWithWorkflowTool();

  // Only run workflow execution if tool is registered
  if (results.toolRegistration) {
    results.workflowExecution = await testWorkflowExecution();
  } else {
    console.log("\n⚠️  Skipping workflow execution test (tool not registered)");
  }

  // Summary
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║  Test Summary                                              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const passed = Object.values(results).filter((r) => r).length;
  const total = Object.keys(results).length;

  console.log(`\nTests Passed: ${passed}/${total}`);
  console.log("\nDetailed Results:");
  console.log(
    `  Tool Registration:      ${
      results.toolRegistration ? "✅ PASS" : "❌ FAIL"
    }`
  );
  console.log(
    `  Schema Validation:      ${
      results.schemaValidation ? "✅ PASS" : "❌ FAIL"
    }`
  );
  console.log(
    `  Chat Agent Integration: ${
      results.chatAgentIntegration ? "✅ PASS" : "❌ FAIL"
    }`
  );
  console.log(
    `  Workflow Execution:     ${
      results.workflowExecution ? "✅ PASS" : "❌ FAIL"
    }`
  );

  if (passed === total) {
    console.log("\n✅ All automated tests passed!");
    console.log("   Ready for manual testing.");
    console.log("   See MANUAL_TESTING_GUIDE.md for next steps.");
  } else {
    console.log("\n❌ Some tests failed.");
    console.log("   Please fix issues before manual testing.");
  }

  console.log("\n" + "=".repeat(60));

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error("\n❌ Fatal error running tests:", error);
  process.exit(1);
});
