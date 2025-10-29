/**
 * Test script for intelligent routing system
 * Tests all complexity levels and verifies routing logic
 */

import {
  detectQueryComplexity,
  shouldUseMastra,
} from "../lib/ai/complexity-detector";

const testQueries = [
  {
    query: "What is contract law?",
    expectedComplexity: "simple",
    expectedRoute: "AI SDK",
  },
  {
    query: "Explain property rights in Zimbabwe",
    expectedComplexity: "light",
    expectedRoute: "AI SDK",
  },
  {
    query: "Find cases about labor disputes in Zimbabwe",
    expectedComplexity: "medium",
    expectedRoute: "Mastra",
  },
  {
    query:
      "Compare precedents on intellectual property rights across different jurisdictions",
    expectedComplexity: "deep",
    expectedRoute: "Mastra",
  },
  {
    query: "Review this contract for legal compliance and suggest improvements",
    expectedComplexity: "workflow",
    expectedRoute: "Mastra",
  },
  {
    query: "What are the recent developments in Zimbabwe land reform?",
    expectedComplexity: "medium",
    expectedRoute: "Mastra",
  },
  {
    query: "How does contract formation work?",
    expectedComplexity: "light",
    expectedRoute: "AI SDK",
  },
  {
    query:
      "Analyze case law on employment termination and extract key holdings",
    expectedComplexity: "deep",
    expectedRoute: "Mastra",
  },
];

console.log("=".repeat(80));
console.log("INTELLIGENT ROUTING TEST");
console.log("=".repeat(80));
console.log();

let passed = 0;
let failed = 0;

for (const test of testQueries) {
  const analysis = detectQueryComplexity(test.query);
  const useMastra = shouldUseMastra(analysis.complexity);
  const actualRoute = useMastra ? "Mastra" : "AI SDK";

  const complexityMatch = analysis.complexity === test.expectedComplexity;
  const routeMatch = actualRoute === test.expectedRoute;
  const testPassed = complexityMatch && routeMatch;

  if (testPassed) {
    passed++;
    console.log("✅ PASS");
  } else {
    failed++;
    console.log("❌ FAIL");
  }

  console.log(`Query: "${test.query}"`);
  console.log(`Expected: ${test.expectedComplexity} → ${test.expectedRoute}`);
  console.log(`Actual: ${analysis.complexity} → ${actualRoute}`);
  console.log(`Reasoning: ${analysis.reasoning}`);
  console.log(`Steps: ${analysis.estimatedSteps}`);
  console.log();
}

console.log("=".repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("=".repeat(80));

if (failed > 0) {
  process.exit(1);
}
