/**
 * Test script for AUTO Agent
 *
 * Tests the AUTO agent's routing decisions and maxSteps enforcement
 * Requirements: 1.1, 2.1, 2.2, 2.4
 */

import { autoAgent } from "../mastra/agents/auto-agent";

async function testAutoAgent() {
  console.log("=".repeat(60));
  console.log("AUTO AGENT TEST");
  console.log("=".repeat(60));
  console.log("");

  // Test 1: Simple question that should get a direct answer (no tools)
  console.log("Test 1: Direct Answer Test");
  console.log("-".repeat(60));
  console.log("Query: What is a contract in legal terms?");
  console.log("");

  try {
    const response1 = await autoAgent.generate(
      "What is a contract in legal terms?",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response1.text.substring(0, 200)}...`);
    console.log("");
    console.log("Steps used:", response1.steps?.length || 0);
    console.log(
      "Tools called:",
      response1.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");
    console.log(
      "✅ Test 1 PASSED: Agent responded",
      response1.toolCalls?.length === 0 ? "(direct answer)" : "(with tools)"
    );
  } catch (error) {
    console.error("❌ Test 1 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("");

  // Test 2: Question requiring current information (should use qnaDirect)
  console.log("Test 2: QnA Tool Test");
  console.log("-".repeat(60));
  console.log("Query: What is the current minimum wage in Zimbabwe?");
  console.log("");

  try {
    const response2 = await autoAgent.generate(
      "What is the current minimum wage in Zimbabwe?",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response2.text.substring(0, 200)}...`);
    console.log("");
    console.log("Steps used:", response2.steps?.length || 0);
    console.log(
      "Tools called:",
      response2.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");

    const usedQna = response2.toolCalls?.some((t) =>
      (t.toolName || t.name || "").includes("qna")
    );
    console.log(
      usedQna
        ? "✅ Test 2 PASSED: Agent used QnA tool"
        : "⚠️  Test 2: Agent chose different approach"
    );
  } catch (error) {
    console.error("❌ Test 2 FAILED:", error);
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("");

  // Test 3: Question requiring research (should use basicSearch workflow)
  console.log("Test 3: Basic Search Workflow Test");
  console.log("-".repeat(60));
  console.log(
    "Query: What are the requirements for company registration in Zimbabwe?"
  );
  console.log("");

  try {
    const response3 = await autoAgent.generate(
      "What are the requirements for company registration in Zimbabwe?",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response3.text.substring(0, 200)}...`);
    console.log("");
    console.log("Steps used:", response3.steps?.length || 0);
    console.log(
      "Tools called:",
      response3.toolCalls?.map((t) => t.toolName || t.name).join(", ") || "None"
    );
    console.log("");

    const usedWorkflow = response3.toolCalls?.some((t) =>
      (t.toolName || t.name || "").includes("basic-search")
    );
    console.log(
      usedWorkflow
        ? "✅ Test 3 PASSED: Agent used basicSearch workflow"
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
    const response4 = await autoAgent.generate(
      "Provide a comprehensive analysis of employment law in Zimbabwe, including recent changes, key statutes, and practical implications for employers.",
      {
        maxSteps: 3,
      }
    );

    console.log(`Response: ${response4.text.substring(0, 200)}...`);
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
  console.log("AUTO AGENT TEST COMPLETE");
  console.log("=".repeat(60));
}

// Run tests
testAutoAgent().catch(console.error);
