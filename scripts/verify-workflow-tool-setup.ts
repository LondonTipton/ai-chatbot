/**
 * Verification script for Advanced Search Workflow Tool Integration
 *
 * This script checks the setup without executing workflows
 */

import { readFileSync } from "fs";
import { join } from "path";

function checkFileExists(filePath: string): boolean {
  try {
    readFileSync(filePath, "utf-8");
    return true;
  } catch {
    return false;
  }
}

function checkFileContains(
  filePath: string,
  searchStrings: string[]
): { found: string[]; missing: string[] } {
  try {
    const content = readFileSync(filePath, "utf-8");
    const found: string[] = [];
    const missing: string[] = [];

    for (const search of searchStrings) {
      if (content.includes(search)) {
        found.push(search);
      } else {
        missing.push(search);
      }
    }

    return { found, missing };
  } catch (error) {
    return { found: [], missing: searchStrings };
  }
}

async function runVerification() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Workflow Tool Integration Setup Verification             ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  let allPassed = true;

  // Test 1: Check workflow tool file exists
  console.log("Test 1: Workflow Tool File");
  const toolFile = "mastra/tools/advanced-search-workflow-tool.ts";
  if (checkFileExists(toolFile)) {
    console.log("✅ Workflow tool file exists");

    // Check tool file content
    const toolChecks = checkFileContains(toolFile, [
      "createTool",
      "advancedSearchWorkflow",
      "inputSchema",
      "outputSchema",
      "execute",
    ]);

    if (toolChecks.missing.length === 0) {
      console.log("✅ Tool file contains all required components");
    } else {
      console.log("❌ Tool file missing:", toolChecks.missing.join(", "));
      allPassed = false;
    }
  } else {
    console.log("❌ Workflow tool file not found");
    allPassed = false;
  }

  // Test 2: Check tool is exported from index
  console.log("\nTest 2: Tool Export");
  const indexFile = "mastra/tools/index.ts";
  const indexChecks = checkFileContains(indexFile, [
    "advancedSearchWorkflowTool",
    "advanced-search-workflow-tool",
  ]);

  if (indexChecks.found.length > 0) {
    console.log("✅ Tool is exported from tools/index.ts");
  } else {
    console.log("❌ Tool not exported from tools/index.ts");
    allPassed = false;
  }

  // Test 3: Check Chat Agent integration
  console.log("\nTest 3: Chat Agent Integration");
  const chatAgentFile = "mastra/agents/chat-agent.ts";
  const chatAgentChecks = checkFileContains(chatAgentFile, [
    "advancedSearchWorkflowTool",
    "advancedSearchWorkflow",
  ]);

  if (chatAgentChecks.found.length > 0) {
    console.log("✅ Workflow tool imported in Chat Agent");

    // Check if tool is registered
    const registrationChecks = checkFileContains(chatAgentFile, [
      "tools:",
      "advancedSearchWorkflow:",
    ]);

    if (registrationChecks.found.length === 2) {
      console.log("✅ Tool registered in Chat Agent tools");
    } else {
      console.log("⚠️  Tool may not be properly registered");
    }
  } else {
    console.log("❌ Workflow tool not imported in Chat Agent");
    allPassed = false;
  }

  // Test 4: Check Mastra SDK Integration
  console.log("\nTest 4: Mastra SDK Integration");
  const mastraFile = "lib/ai/mastra-sdk-integration.ts";
  const mastraChecks = checkFileContains(mastraFile, [
    "selectAgentForComplexity",
    "medium",
    "chatAgent",
  ]);

  if (mastraChecks.found.length === 3) {
    console.log("✅ Mastra SDK integration includes complexity routing");

    // Check if medium routes to chatAgent
    const content = readFileSync(mastraFile, "utf-8");
    if (
      content.includes('case "medium"') &&
      content.includes('return "chatAgent"')
    ) {
      console.log("✅ Medium complexity routes to chatAgent");
    } else {
      console.log("⚠️  Medium complexity routing may need verification");
    }
  } else {
    console.log("❌ Mastra SDK integration incomplete");
    allPassed = false;
  }

  // Test 5: Check Chat Route
  console.log("\nTest 5: Chat Route Configuration");
  const routeFile = "app/(chat)/api/chat/route.ts";
  const routeChecks = checkFileContains(routeFile, [
    "detectQueryComplexity",
    "shouldUseMastra",
    "streamMastraAgent",
  ]);

  if (routeChecks.found.length === 3) {
    console.log("✅ Chat route has complexity detection and Mastra routing");
  } else {
    console.log("❌ Chat route configuration incomplete");
    console.log("   Missing:", routeChecks.missing.join(", "));
    allPassed = false;
  }

  // Test 6: Check Manual Testing Guide
  console.log("\nTest 6: Documentation");
  const guideFile =
    ".kiro/specs/medium-research-tool-integration/MANUAL_TESTING_GUIDE.md";
  if (checkFileExists(guideFile)) {
    console.log("✅ Manual testing guide exists");
  } else {
    console.log("⚠️  Manual testing guide not found");
  }

  // Summary
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║  Verification Summary                                      ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  if (allPassed) {
    console.log("✅ All setup verification checks passed!");
    console.log("\nNext Steps:");
    console.log("1. Start the development server: pnpm dev");
    console.log("2. Follow the manual testing guide:");
    console.log(
      "   .kiro/specs/medium-research-tool-integration/MANUAL_TESTING_GUIDE.md"
    );
    console.log("3. Test each scenario and document results");
    console.log("4. Mark task as complete when all tests pass");
  } else {
    console.log("❌ Some verification checks failed");
    console.log("\nPlease review the failed checks above and fix any issues.");
  }

  console.log("\n" + "=".repeat(60));
}

runVerification().catch((error) => {
  console.error("Error running verification:", error);
  process.exit(1);
});
