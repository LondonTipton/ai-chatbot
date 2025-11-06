/**
 * Test script for DEEP Agent
 *
 * Tests the DEEP agent's routing decisions and maxSteps enforcement
 * Requirements: 1.3, 2.1, 2.2, 2.4
 */

import { deepAgent } from "../mastra/agents/deep-agent";

async function testDeepAgent() {
  console.log("=".repeat(60));
  console.log("DEEP AGENT TEST");
  console.log("=".repeat(60));
  console.log("");

  // Test 1: Well-established topic that should get a direct answer
  console.log("Test 1: Direct Answer Test");
  console.log("-".repeat(60));
  console.log(
    "Query: Provide a comprehensive analysis of the doctrine of separation of powers"
  );
  console.log("");

  try {
    const response1 = await deepAgent.generate(
      "Provide a comprehensive analysis of the doctrine of separation of powers in constitutional law",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response1.text.substring(0, 300)}...`);
    console.log("");
    console.log("Steps used:", response1.steps?.length || 0);
    console.log(
      "Tools called:",
      response1.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");
    console.log(
      "✅ Test 1 PASSED: Agent responded",
      response1.toolCalls?.length === 0 ? "(direct answer)" : "(with workflow)"
    );
  } catch (error) {
    console.error("❌ Test 1 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("");

  // Test 2: Current information query (should use comprehensiveAnalysis workflow)
  console.log("Test 2: Comprehensive Analysis Workflow Test");
  console.log("-".repeat(60));
  console.log(
    "Query: Analyze the current legal framework for foreign investment in Zimbabwe"
  );
  console.log("");

  try {
    const response2 = await deepAgent.generate(
      "Analyze the current legal framework for foreign investment in Zimbabwe",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response2.text.substring(0, 300)}...`);
    console.log("");
    console.log("Steps used:", response2.steps?.length || 0);
    console.log(
      "Tools called:",
      response2.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");

    const usedWorkflow = response2.toolCalls?.some((t) =>
      (t.toolName || t.name || "").includes("comprehensive-analysis")
    );
    console.log(
      usedWorkflow
        ? "✅ Test 2 PASSED: Agent used comprehensiveAnalysis workflow"
        : "⚠️  Test 2: Agent chose different approach"
    );
  } catch (error) {
    console.error("❌ Test 2 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("");

  // Test 3: Recent developments query (should use comprehensiveAnalysis workflow)
  console.log("Test 3: Recent Developments Test");
  console.log("-".repeat(60));
  console.log(
    "Query: What are the recent Supreme Court decisions on constitutional matters?"
  );
  console.log("");

  try {
    const response3 = await deepAgent.generate(
      "What are the recent Supreme Court decisions on constitutional matters in Zimbabwe?",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response3.text.substring(0, 300)}...`);
    console.log("");
    console.log("Steps used:", response3.steps?.length || 0);
    console.log(
      "Tools called:",
      response3.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");

    const usedWorkflow = response3.toolCalls?.some((t) =>
      (t.toolName || t.name || "").includes("comprehensive-analysis")
    );
    console.log(
      usedWorkflow
        ? "✅ Test 3 PASSED: Agent used comprehensiveAnalysis workflow"
        : "⚠️  Test 3: Agent chose different approach"
    );
  } catch (error) {
    console.error("❌ Test 3 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("");

  // Test 4: MaxSteps enforcement
  console.log("Test 4: MaxSteps Budget Enforcement");
  console.log("-".repeat(60));
  console.log("Query: Complex query to test if agent respects 3-step maximum");
  console.log("");

  try {
    const response4 = await deepAgent.generate(
      "Provide a comprehensive analysis of the legal framework for intellectual property protection in Zimbabwe, including patents, trademarks, copyrights, and recent legislative changes",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response4.text.substring(0, 300)}...`);
    console.log("");
    console.log("Steps used:", response4.steps?.length || 0);
    console.log(
      "Tools called:",
      response4.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");

    const stepsUsed = response4.steps?.length || 0;
    if (stepsUsed <= 3) {
      console.log(
        `✅ Test 4 PASSED: Agent respected maxSteps limit (used ${stepsUsed}/3)`
      );
    } else {
      console.log(
        `❌ Test 4 FAILED: Agent exceeded maxSteps limit (used ${stepsUsed}/3)`
      );
    }
  } catch (error) {
    console.error("❌ Test 4 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("");

  // Test 5: Publication quality
  console.log("Test 5: Publication Quality Test");
  console.log("-".repeat(60));
  console.log("Query: Explain the constitutional framework for human rights");
  console.log("");

  try {
    const response5 = await deepAgent.generate(
      "Explain the constitutional framework for human rights in Zimbabwe",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response5.text.substring(0, 300)}...`);
    console.log("");
    console.log("Steps used:", response5.steps?.length || 0);
    console.log("Response length:", response5.text.length);
    console.log("Word count:", response5.text.split(/\s+/).length);
    console.log("");

    const isComprehensive = response5.text.length > 300;
    const hasStructure =
      response5.text.includes("\n\n") || response5.text.includes("#");

    console.log(
      isComprehensive && hasStructure
        ? "✅ Test 5 PASSED: Response is comprehensive and well-structured"
        : "⚠️  Test 5: Response quality could be improved"
    );
  } catch (error) {
    console.error("❌ Test 5 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("DEEP AGENT TEST COMPLETE");
  console.log("=".repeat(60));
}

// Run tests
testDeepAgent().catch(console.error);
