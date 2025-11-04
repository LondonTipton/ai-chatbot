/**
 * Verification script for agent tool access
 *
 * This script verifies that all Mastra agents have access to all tools
 * as required by Requirement 11.8.
 */

import { analyzeAgent } from "../lib/ai/agents/analyze-agent";
import { caseSearchAgent } from "../lib/ai/agents/case-search-agent";
import { compareAgent } from "../lib/ai/agents/compare-agent";
import { draftAgent } from "../lib/ai/agents/draft-agent";
import { extractAgent } from "../lib/ai/agents/extract-agent";
import { holdingsAgent } from "../lib/ai/agents/holdings-agent";
import { issuesAgent } from "../lib/ai/agents/issues-agent";
import { mediumResearchAgent } from "../lib/ai/agents/medium-research";
import { recommendationsAgent } from "../lib/ai/agents/recommendations-agent";
import { refineAgent } from "../lib/ai/agents/refine-agent";
import { researchAgent } from "../lib/ai/agents/research-agent";
import { searchAgent } from "../lib/ai/agents/search-agent";
import { structureAgent } from "../lib/ai/agents/structure-agent";

console.log("🤖 Verifying Agent Tool Access...\n");

const agents = [
  { name: "medium-research", agent: mediumResearchAgent },
  { name: "search-agent", agent: searchAgent },
  { name: "extract-agent", agent: extractAgent },
  { name: "analyze-agent", agent: analyzeAgent },
  { name: "structure-agent", agent: structureAgent },
  { name: "issues-agent", agent: issuesAgent },
  { name: "recommendations-agent", agent: recommendationsAgent },
  { name: "case-search-agent", agent: caseSearchAgent },
  { name: "holdings-agent", agent: holdingsAgent },
  { name: "compare-agent", agent: compareAgent },
  { name: "research-agent", agent: researchAgent },
  { name: "draft-agent", agent: draftAgent },
  { name: "refine-agent", agent: refineAgent },
];

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

let allAgentsHaveAllTools = true;

for (const { name, agent } of agents) {
  console.log(`\n📋 Checking ${name}:`);

  const agentTools = agent.tools || {};
  const toolNames = Object.keys(agentTools);

  console.log(`  Tools configured: ${toolNames.length}`);

  // Check if agent has all required tools
  const missingTools = requiredTools.filter((tool) => !agentTools[tool]);

  if (missingTools.length === 0) {
    console.log(`  ✓ Has all ${requiredTools.length} required tools`);
  } else {
    console.log(
      `  ✗ Missing ${missingTools.length} tools: ${missingTools.join(", ")}`
    );
    allAgentsHaveAllTools = false;
  }
}

if (!allAgentsHaveAllTools) {
  console.error("\n❌ Some agents are missing required tools!");
  console.error(
    "Requirement 11.8 states: All agents SHALL have access to ALL tools"
  );
  process.exit(1);
}

console.log("\n✅ All agents have access to all required tools!");
console.log("\nSummary:");
console.log(`  - Total agents checked: ${agents.length}`);
console.log(`  - Required tools per agent: ${requiredTools.length}`);
console.log("  - All agents have all tools: ✓");
console.log("\n🎉 Agent tool access verified successfully!");
console.log(
  "\nRequirement 11.8 satisfied: All agents have access to all tools ✓"
);
