#!/usr/bin/env tsx

/**
 * Test Script for MEDIUM Agent
 *
 * This script tests the MEDIUM agent with various query types to verify:
 * - Routing decisions (direct answer, qnaDirect, advancedSearch, newsSearch)
 * - Multi-workflow invocation for comparative analysis
 * - MaxSteps budget enforcement (6 steps)
 * - Token budget compliance (1K-8K tokens)
 * - Zimbabwe legal context inclusion
 *
 * Usage:
 *   tsx scripts/test-medium-agent.ts
 */

import { mediumAgent } from "../mastra/agents/medium-agent";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(80));
  log(title, colors.bright + colors.blue);
  console.log("=".repeat(80) + "\n");
}

function logResult(label: string, value: any) {
  log(`${label}: `, colors.cyan);
  console.log(value);
  console.log();
}

async function testQuery(
  description: string,
  query: string,
  expectedBehavior: string
) {
  logSection(description);
  log(`Query: "${query}"`, colors.yellow);
  log(`Expected: ${expectedBehavior}`, colors.green);
  console.log();

  try {
    const startTime = Date.now();

    const response = await mediumAgent.generate(query, {
      maxSteps: 6,
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Extract metadata
    const stepsUsed = response.steps?.length || 0;
    const toolCalls = response.toolCalls || [];
    const toolNames = toolCalls.map((t) => t.toolName);
    const estimatedTokens = Math.ceil(response.text.length / 4);

    // Log results
    logResult("Response", response.text.substring(0, 500) + "...");
    logResult("Duration", `${duration}s`);
    logResult("Steps Used", `${stepsUsed}/6`);
    logResult(
      "Tools Called",
      toolNames.length > 0 ? toolNames : "None (direct answer)"
    );
    logResult("Estimated Tokens", estimatedTokens);
    logResult(
      "Within Budget",
      estimatedTokens >= 250 && estimatedTokens <= 2000 ? "✓ Yes" : "✗ No"
    );
    logResult("Within Step Budget", stepsUsed <= 6 ? "✓ Yes" : "✗ No");

    // Check for Zimbabwe context
    const hasZimbabweContext =
      response.text.toLowerCase().includes("zimbabwe") ||
      response.text.toLowerCase().includes("zimbabwean");
    logResult("Zimbabwe Context", hasZimbabweContext ? "✓ Yes" : "✗ No");

    log("✓ Test completed successfully", colors.green);
  } catch (error) {
    log(`✗ Test failed: ${error}`, colors.red);
    console.error(error);
  }
}

async function main() {
  log("\n🧪 MEDIUM Agent Test Suite", colors.bright + colors.blue);
  log(
    "Testing routing decisions, multi-workflow invocation, and budget enforcement\n",
    colors.cyan
  );

  // Verify environment variables
  if (!process.env.CEREBRAS_API_KEY) {
    log("✗ Error: CEREBRAS_API_KEY not found in environment", colors.red);
    process.exit(1);
  }

  if (!process.env.TAVILY_API_KEY) {
    log("✗ Error: TAVILY_API_KEY not found in environment", colors.red);
    process.exit(1);
  }

  log("✓ Environment variables verified", colors.green);

  // Test 1: Direct Answer for Well-Known Concepts
  await testQuery(
    "Test 1: Direct Answer Routing",
    "Explain the hierarchy of courts in Zimbabwe",
    "Should answer directly without tools for well-known legal structure"
  );

  // Test 2: Advanced Search for Comprehensive Research
  await testQuery(
    "Test 2: Advanced Search Workflow",
    "Analyze the legal framework for foreign investment in Zimbabwe",
    "Should use advancedSearch workflow for comprehensive research"
  );

  // Test 3: News Search for Time-Sensitive Queries
  await testQuery(
    "Test 3: News Search Tool",
    "What are the latest legal reforms in Zimbabwe?",
    "Should use newsSearch tool for time-sensitive queries"
  );

  // Test 4: QnA Direct for Quick Facts
  await testQuery(
    "Test 4: QnA Direct Tool",
    "What is the current minimum wage in Zimbabwe?",
    "Should use qnaDirect tool for quick factual queries"
  );

  // Test 5: Comparative Analysis with Multiple Tools
  await testQuery(
    "Test 5: Multi-Workflow Invocation",
    "Compare employment termination procedures for misconduct versus redundancy in Zimbabwe",
    "Should use multiple tool calls for comparative analysis"
  );

  // Test 6: MaxSteps Budget Enforcement
  await testQuery(
    "Test 6: MaxSteps Budget Enforcement",
    "Provide comprehensive analysis of corporate governance, employment law, tax obligations, and IP protection for businesses in Zimbabwe",
    "Should respect maxSteps=6 limit even for complex query"
  );

  // Test 7: Token Budget Compliance
  await testQuery(
    "Test 7: Token Budget Compliance",
    "Explain the process for registering a private company in Zimbabwe",
    "Should stay within 1K-8K token budget"
  );

  // Test 8: Zimbabwe Context Inclusion
  await testQuery(
    "Test 8: Zimbabwe Legal Context",
    "What are the requirements for a valid contract?",
    "Should include Zimbabwe-specific legal context"
  );

  logSection("Test Suite Complete");
  log("✓ All tests completed", colors.green);
  log(
    "\nNote: Review the results above to verify routing decisions and budget compliance",
    colors.cyan
  );
}

// Run the test suite
main().catch((error) => {
  log(`\n✗ Fatal error: ${error}`, colors.red);
  console.error(error);
  process.exit(1);
});
