/**
 * Manual Test Script for Comprehensive Analysis Workflow
 *
 * This script tests the comprehensive analysis workflow with various queries
 * to verify:
 * - Both enhance and deep-dive paths work correctly
 * - Token budgets are respected (18K-20K range)
 * - Response quality is high
 * - Zimbabwe legal context is included
 *
 * Usage:
 *   pnpm tsx scripts/test-comprehensive-analysis-workflow.ts
 */

import { comprehensiveAnalysisWorkflow } from "@/mastra/workflows/comprehensive-analysis-workflow";

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
  console.log("\n" + "=".repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log("=".repeat(80) + "\n");
}

function logResult(label: string, value: any) {
  console.log(`${colors.blue}${label}:${colors.reset} ${value}`);
}

async function testWorkflow(
  query: string,
  jurisdiction = "Zimbabwe",
  expectedPath?: "enhance" | "deep-dive"
) {
  logSection(`Testing: ${query}`);

  try {
    const startTime = Date.now();

    log("Executing workflow...", colors.yellow);

    const run = await comprehensiveAnalysisWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query,
        jurisdiction,
      },
    });

    const duration = Date.now() - startTime;

    if (result.status !== "success") {
      throw new Error(`Workflow failed with status: ${result.status}`);
    }

    const output = result.steps.document?.output;

    if (!output) {
      throw new Error("No output from document step");
    }

    log("\n✓ Workflow completed successfully", colors.green);

    logResult("Path Taken", output.path);
    logResult("Duration", `${(duration / 1000).toFixed(2)}s`);
    logResult("Total Tokens", output.totalTokens);
    logResult(
      "Within Budget",
      output.totalTokens <= 20_000 ? "✓ Yes" : "✗ No (EXCEEDED)"
    );
    logResult(
      "In Target Range (18K-20K)",
      output.totalTokens >= 18_000 && output.totalTokens <= 20_000
        ? "✓ Yes"
        : "○ No (but acceptable)"
    );
    logResult("Response Length", `${output.response.length} characters`);

    // Check if expected path matches
    if (expectedPath && output.path !== expectedPath) {
      log(
        `\n⚠ Warning: Expected ${expectedPath} path but got ${output.path}`,
        colors.yellow
      );
    }

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
      output.response.includes("Source:");
    logResult("Citations", hasCitations ? "✓ Present" : "✗ Missing");

    // Show response preview
    log("\nResponse Preview (first 500 chars):", colors.blue);
    console.log(output.response.substring(0, 500) + "...\n");

    return {
      success: true,
      path: output.path,
      tokens: output.totalTokens,
      duration,
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

  // Test 1: Well-covered topic (should take enhance path)
  results.push(
    await testWorkflow("contract law basic principles", "Zimbabwe", "enhance")
  );

  // Test 2: Specific topic (could take either path)
  results.push(
    await testWorkflow("employment law termination procedures", "Zimbabwe")
  );

  // Test 3: Niche topic (more likely to take deep-dive path)
  results.push(
    await testWorkflow("cryptocurrency regulation legal framework", "Zimbabwe")
  );

  // Test 4: Complex topic (more likely to take deep-dive path)
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

    logResult("Average Tokens", avgTokens.toFixed(0));
    logResult("Average Duration", `${(avgDuration / 1000).toFixed(2)}s`);

    // Path distribution
    const enhancePaths = results.filter(
      (r) => r.success && r.path === "enhance"
    ).length;
    const deepDivePaths = results.filter(
      (r) => r.success && r.path === "deep-dive"
    ).length;

    logResult("Enhance Paths", enhancePaths);
    logResult("Deep Dive Paths", deepDivePaths);

    // Budget compliance
    const withinBudget = results.filter(
      (r) => r.success && r.tokens <= 20_000
    ).length;
    logResult(
      "Within Budget (≤20K)",
      `${withinBudget}/${successful} (${(
        (withinBudget / successful) *
        100
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
