/**
 * Manual Test Script for Comprehensive Analysis Workflow V2
 *
 * This script tests the comprehensive analysis workflow V2 with various queries
 * to verify:
 * - Initial search + gap analysis + follow-up searches work correctly
 * - Token budgets are reasonable (5K-10K range)
 * - Response quality is high
 * - Zimbabwe legal context is included
 *
 * V2 Changes:
 * - Uses simplified Tavily integration (raw results → Chat Agent)
 * - No entity extraction/validation
 * - Includes conversation history support
 * - More efficient token usage
 *
 * Usage:
 *   pnpm tsx scripts/test-comprehensive-analysis-workflow.ts
 */

import { comprehensiveAnalysisWorkflowV2 } from "../mastra/workflows/comprehensive-analysis-workflow-v2";

// ANSI color codes for better output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log(`\n${"=".repeat(80)}`);
  log(title, colors.bright + colors.cyan);
  console.log(`${"=".repeat(80)}\n`);
}

function logResult(label: string, value: any) {
  console.log(`${colors.blue}${label}:${colors.reset} ${value}`);
}

async function testWorkflow(query: string, jurisdiction = "Zimbabwe") {
  logSection(`Testing: ${query}`);

  try {
    const startTime = Date.now();

    log("Executing workflow...", colors.yellow);

    const run = await comprehensiveAnalysisWorkflowV2.createRunAsync();

    const result = await run.start({
      inputData: {
        query,
        jurisdiction,
        conversationHistory: [], // Empty for standalone test
      },
    });

    const duration = Date.now() - startTime;

    if (result.status !== "success") {
      throw new Error(`Workflow failed with status: ${result.status}`);
    }

    const followUpStep = result.steps["follow-up-searches"];

    if (!followUpStep || followUpStep.status !== "success") {
      throw new Error("Follow-up-searches step failed or not found");
    }

    const output = followUpStep.output as {
      response: string;
      sources: Array<{ title: string; url: string }>;
      totalTokens: number;
    };

    log("\n✓ Workflow completed successfully", colors.green);

    logResult("Duration", `${(duration / 1000).toFixed(2)}s`);
    logResult("Total Tokens", output.totalTokens);
    logResult(
      "Within Budget",
      output.totalTokens <= 10_000 ? "✓ Yes" : "✗ No (EXCEEDED)"
    );
    logResult(
      "In Target Range (5K-10K)",
      output.totalTokens >= 5000 && output.totalTokens <= 10_000
        ? "✓ Yes"
        : "○ No (but acceptable)"
    );
    logResult("Response Length", `${output.response.length} characters`);
    logResult("Sources", output.sources.length);

    // Check for Zimbabwe context
    const hasZimbabweContext = output.response
      .toLowerCase()
      .includes("zimbabwe");
    logResult(
      "Zimbabwe Context",
      hasZimbabweContext ? "✓ Present" : "✗ Missing"
    );

    // Check for citations
    const hasCitations =
      output.response.includes("http://") ||
      output.response.includes("https://") ||
      output.response.includes("[");
    logResult("Citations", hasCitations ? "✓ Present" : "✗ Missing");

    // Show response preview
    log("\nResponse Preview (first 500 chars):", colors.blue);
    console.log(`${output.response.substring(0, 500)}...\n`);

    return {
      success: true,
      tokens: output.totalTokens,
      duration,
      sources: output.sources.length,
    };
  } catch (error) {
    log("\n✗ Workflow failed", colors.red);
    console.error(error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTests() {
  log(
    "Comprehensive Analysis Workflow Test Suite",
    colors.bright + colors.cyan
  );
  log("Testing both enhance and deep-dive paths\n", colors.cyan);

  // Verify environment variables
  if (!process.env.TAVILY_API_KEY) {
    log("✗ TAVILY_API_KEY not found in environment", colors.red);
    process.exit(1);
  }

  if (!process.env.CEREBRAS_API_KEY) {
    log("✗ CEREBRAS_API_KEY not found in environment", colors.red);
    process.exit(1);
  }

  log("✓ Environment variables verified\n", colors.green);

  const results: any[] = [];

  // Test 1: Well-covered topic
  results.push(await testWorkflow("contract law basic principles", "Zimbabwe"));

  // Test 2: Specific topic
  results.push(
    await testWorkflow("employment law termination procedures", "Zimbabwe")
  );

  // Test 3: Niche topic
  results.push(
    await testWorkflow("cryptocurrency regulation legal framework", "Zimbabwe")
  );

  // Test 4: Complex topic
  results.push(
    await testWorkflow(
      "intellectual property rights enforcement mechanisms",
      "Zimbabwe"
    )
  );

  // Test 5: Another well-established topic
  results.push(await testWorkflow("property law ownership rights", "Zimbabwe"));

  // Summary
  logSection("Test Summary");

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  logResult("Total Tests", results.length);
  logResult("Successful", `${successful} ✓`);
  logResult("Failed", failed > 0 ? `${failed} ✗` : "0");

  if (successful > 0) {
    const avgTokens =
      results.filter((r) => r.success).reduce((sum, r) => sum + r.tokens, 0) /
      successful;
    const avgDuration =
      results.filter((r) => r.success).reduce((sum, r) => sum + r.duration, 0) /
      successful;
    const avgSources =
      results.filter((r) => r.success).reduce((sum, r) => sum + r.sources, 0) /
      successful;

    logResult("Average Tokens", avgTokens.toFixed(0));
    logResult("Average Duration", `${(avgDuration / 1000).toFixed(2)}s`);
    logResult("Average Sources", avgSources.toFixed(1));

    // Budget compliance
    const withinBudget = results.filter(
      (r) => r.success && r.tokens <= 10_000
    ).length;
    logResult(
      "Within Budget (≤10K)",
      `${withinBudget}/${successful} (${(
        (withinBudget / successful) * 100
      ).toFixed(0)}%)`
    );
  }

  if (failed > 0) {
    log(
      "\n⚠ Some tests failed. Check the output above for details.",
      colors.red
    );
    process.exit(1);
  } else {
    log("\n✓ All tests passed successfully!", colors.green);
  }
}

// Run tests
runTests().catch((error) => {
  log("\n✗ Test suite failed with error:", colors.red);
  console.error(error);
  process.exit(1);
});
