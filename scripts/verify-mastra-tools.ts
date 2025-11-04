/**
 * Verification script for Mastra tools integration
 *
 * This script verifies that all required tools are properly configured
 * and accessible to Mastra agents.
 */

import { getAllTools } from "../mastra/tools";

console.log("🔧 Verifying Mastra Tools Integration...\n");

const tools = getAllTools();

// Check all required tools are present
const requiredTools = [
  "tavilySearch",
  "tavilySearchAdvanced",
  "tavilyQna",
  "tavilyExtract",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  "summarizeContent",
  "getWeather",
];

console.log("✅ Checking tool presence:");
let allPresent = true;
for (const toolName of requiredTools) {
  if (tools[toolName as keyof typeof tools]) {
    console.log(`  ✓ ${toolName}`);
  } else {
    console.log(`  ✗ ${toolName} - MISSING`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.error("\n❌ Some tools are missing!");
  process.exit(1);
}

console.log("\n✅ Checking tool IDs:");
const expectedIds: Record<string, string> = {
  tavilySearch: "tavily-search",
  tavilySearchAdvanced: "tavily-search-advanced",
  tavilyQna: "tavily-qna",
  tavilyExtract: "tavily-extract",
  createDocument: "create-document",
  updateDocument: "update-document",
  requestSuggestions: "request-suggestions",
  summarizeContent: "summarize-content",
  getWeather: "get-weather",
};

let allIdsCorrect = true;
for (const [toolName, expectedId] of Object.entries(expectedIds)) {
  const tool = tools[toolName as keyof typeof tools];
  if (tool.id === expectedId) {
    console.log(`  ✓ ${toolName}: ${tool.id}`);
  } else {
    console.log(`  ✗ ${toolName}: expected "${expectedId}", got "${tool.id}"`);
    allIdsCorrect = false;
  }
}

if (!allIdsCorrect) {
  console.error("\n❌ Some tool IDs are incorrect!");
  process.exit(1);
}

console.log("\n✅ Checking tool descriptions:");
let allHaveDescriptions = true;
for (const [toolName, tool] of Object.entries(tools)) {
  if (tool.description && tool.description.length > 0) {
    console.log(`  ✓ ${toolName}: ${tool.description.substring(0, 50)}...`);
  } else {
    console.log(`  ✗ ${toolName}: missing description`);
    allHaveDescriptions = false;
  }
}

if (!allHaveDescriptions) {
  console.error("\n❌ Some tools are missing descriptions!");
  process.exit(1);
}

console.log("\n✅ Checking tool schemas:");
let allHaveSchemas = true;
for (const [toolName, tool] of Object.entries(tools)) {
  const hasInput = !!tool.inputSchema;
  const hasOutput = !!tool.outputSchema;

  if (hasInput && hasOutput) {
    console.log(`  ✓ ${toolName}: input ✓, output ✓`);
  } else {
    console.log(
      `  ✗ ${toolName}: input ${hasInput ? "✓" : "✗"}, output ${
        hasOutput ? "✓" : "✗"
      }`
    );
    allHaveSchemas = false;
  }
}

if (!allHaveSchemas) {
  console.error("\n❌ Some tools are missing schemas!");
  process.exit(1);
}

console.log("\n✅ All Mastra tools are properly configured!");
console.log("\nSummary:");
console.log(`  - Total tools: ${Object.keys(tools).length}`);
console.log("  - All required tools present: ✓");
console.log("  - All tool IDs correct: ✓");
console.log("  - All tools have descriptions: ✓");
console.log("  - All tools have schemas: ✓");
console.log("\n🎉 Mastra tools integration verified successfully!");
