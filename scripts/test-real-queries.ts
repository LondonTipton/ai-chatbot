/**
 * Manual Testing Script for Real Queries
 * Tests Mastra integration with real queries to verify routing and response quality
 */

import {
  detectQueryComplexity,
  shouldUseMastra,
} from "@/lib/ai/complexity-detector";

interface TestQuery {
  query: string;
  expectedComplexity: string;
  expectedRoute: "AI SDK" | "Mastra";
  category: string;
}

const testQueries: TestQuery[] = [
  // Simple queries (should use AI SDK)
  {
    query: "What is a contract?",
    expectedComplexity: "simple",
    expectedRoute: "AI SDK",
    category: "Simple Legal Question",
  },
  {
    query: "Define negligence",
    expectedComplexity: "simple",
    expectedRoute: "AI SDK",
    category: "Simple Legal Question",
  },
  {
    query: "What is the meaning of tort?",
    expectedComplexity: "simple",
    expectedRoute: "AI SDK",
    category: "Simple Legal Question",
  },

  // Light queries (should use AI SDK)
  {
    query: "Explain the concept of consideration in contract law",
    expectedComplexity: "light",
    expectedRoute: "AI SDK",
    category: "Light Research",
  },
  {
    query: "Tell me about the doctrine of precedent",
    expectedComplexity: "light",
    expectedRoute: "AI SDK",
    category: "Light Research",
  },

  // Medium queries (should use Mastra - Medium Agent)
  {
    query: "Find cases about breach of contract in employment law",
    expectedComplexity: "medium",
    expectedRoute: "Mastra",
    category: "Medium Research",
  },
  {
    query: "What are the recent developments in data protection law?",
    expectedComplexity: "medium",
    expectedRoute: "Mastra",
    category: "Medium Research",
  },
  {
    query: "Search for cases on negligence in medical malpractice",
    expectedComplexity: "medium",
    expectedRoute: "Mastra",
    category: "Medium Research",
  },

  // Deep queries (should use Mastra - Deep Workflow)
  {
    query: "Compare cases on duty of care across different jurisdictions",
    expectedComplexity: "deep",
    expectedRoute: "Mastra",
    category: "Deep Research",
  },
  {
    query: "Analyze precedent for fiduciary duty in corporate law",
    expectedComplexity: "deep",
    expectedRoute: "Mastra",
    category: "Deep Research",
  },
  {
    query:
      "Extract key holdings from cases about intellectual property infringement",
    expectedComplexity: "deep",
    expectedRoute: "Mastra",
    category: "Deep Research",
  },

  // Document review workflow (should use Mastra - Review Workflow)
  {
    query: "Review this employment contract and suggest improvements",
    expectedComplexity: "workflow-review",
    expectedRoute: "Mastra",
    category: "Document Review",
  },
  {
    query: "Analyze this document for compliance issues",
    expectedComplexity: "workflow-review",
    expectedRoute: "Mastra",
    category: "Document Review",
  },
  {
    query: "Validate and improve this lease agreement",
    expectedComplexity: "workflow-review",
    expectedRoute: "Mastra",
    category: "Document Review",
  },

  // Case law analysis workflow (should use Mastra - Case Law Workflow)
  {
    query: "Compare precedent on constitutional rights in privacy cases",
    expectedComplexity: "workflow-caselaw",
    expectedRoute: "Mastra",
    category: "Case Law Analysis",
  },
  {
    query: "Compare holdings from different courts on fair use doctrine",
    expectedComplexity: "workflow-caselaw",
    expectedRoute: "Mastra",
    category: "Case Law Analysis",
  },
  {
    query: "Analyze precedent for trademark infringement cases",
    expectedComplexity: "workflow-caselaw",
    expectedRoute: "Mastra",
    category: "Case Law Analysis",
  },

  // Legal drafting workflow (should use Mastra - Drafting Workflow)
  {
    query: "Draft a non-disclosure agreement for a software company",
    expectedComplexity: "workflow-drafting",
    expectedRoute: "Mastra",
    category: "Legal Drafting",
  },
  {
    query: "Create a motion to dismiss for lack of jurisdiction",
    expectedComplexity: "workflow-drafting",
    expectedRoute: "Mastra",
    category: "Legal Drafting",
  },
  {
    query: "Prepare a contract for freelance services",
    expectedComplexity: "workflow-drafting",
    expectedRoute: "Mastra",
    category: "Legal Drafting",
  },
];

function testComplexityDetection() {
  console.log("=".repeat(80));
  console.log("🧪 TESTING COMPLEXITY DETECTION AND ROUTING");
  console.log("=".repeat(80));
  console.log();

  let passCount = 0;
  let failCount = 0;
  const failures: Array<{ query: string; expected: string; actual: string }> =
    [];

  for (const test of testQueries) {
    console.log(`📝 Testing: "${test.query.substring(0, 60)}..."`);
    console.log(`   Category: ${test.category}`);
    console.log(`   Expected Complexity: ${test.expectedComplexity}`);
    console.log(`   Expected Route: ${test.expectedRoute}`);

    const analysis = detectQueryComplexity(test.query);
    const route = shouldUseMastra(analysis.complexity) ? "Mastra" : "AI SDK";

    console.log(`   Actual Complexity: ${analysis.complexity}`);
    console.log(`   Actual Route: ${route}`);
    console.log(`   Reasoning: ${analysis.reasoning}`);

    const complexityMatch = analysis.complexity === test.expectedComplexity;
    const routeMatch = route === test.expectedRoute;

    if (complexityMatch && routeMatch) {
      console.log("   ✅ PASS");
      passCount++;
    } else {
      console.log("   ❌ FAIL");
      failCount++;
      failures.push({
        query: test.query,
        expected: `${test.expectedComplexity} -> ${test.expectedRoute}`,
        actual: `${analysis.complexity} -> ${route}`,
      });
    }

    console.log();
  }

  console.log("=".repeat(80));
  console.log("📊 TEST RESULTS");
  console.log("=".repeat(80));
  console.log(`Total Tests: ${testQueries.length}`);
  console.log(
    `Passed: ${passCount} (${((passCount / testQueries.length) * 100).toFixed(
      1
    )}%)`
  );
  console.log(
    `Failed: ${failCount} (${((failCount / testQueries.length) * 100).toFixed(
      1
    )}%)`
  );
  console.log();

  if (failures.length > 0) {
    console.log("❌ FAILED TESTS:");
    console.log();
    for (const failure of failures) {
      console.log(`Query: "${failure.query.substring(0, 60)}..."`);
      console.log(`  Expected: ${failure.expected}`);
      console.log(`  Actual: ${failure.actual}`);
      console.log();
    }
  }

  console.log("=".repeat(80));
  console.log();

  return { passCount, failCount, total: testQueries.length };
}

function printManualTestingInstructions() {
  console.log("=".repeat(80));
  console.log("📋 MANUAL TESTING INSTRUCTIONS");
  console.log("=".repeat(80));
  console.log();
  console.log("To test with real API calls and verify response quality:");
  console.log();
  console.log("1. Enable Mastra in .env.local:");
  console.log("   ENABLE_MASTRA=true");
  console.log();
  console.log("2. Start the development server:");
  console.log("   pnpm dev");
  console.log();
  console.log("3. Open the application in your browser:");
  console.log("   http://localhost:3000");
  console.log();
  console.log("4. Test each query category:");
  console.log();
  console.log("   SIMPLE QUERIES (should use AI SDK with QNA):");
  console.log("   - What is a contract?");
  console.log("   - Define negligence");
  console.log("   - What is the meaning of tort?");
  console.log();
  console.log("   LIGHT QUERIES (should use AI SDK with advanced search):");
  console.log("   - Explain the concept of consideration in contract law");
  console.log("   - Tell me about the doctrine of precedent");
  console.log();
  console.log("   MEDIUM QUERIES (should use Mastra Medium Agent):");
  console.log("   - Find cases about breach of contract in employment law");
  console.log("   - What are the recent developments in data protection law?");
  console.log();
  console.log("   DEEP QUERIES (should use Mastra Deep Workflow):");
  console.log(
    "   - Compare cases on duty of care across different jurisdictions"
  );
  console.log("   - Analyze precedent for fiduciary duty in corporate law");
  console.log();
  console.log("   DOCUMENT REVIEW (should use Mastra Review Workflow):");
  console.log("   - Review this employment contract and suggest improvements");
  console.log("   - Analyze this document for compliance issues");
  console.log();
  console.log("   CASE LAW ANALYSIS (should use Mastra Case Law Workflow):");
  console.log(
    "   - Compare precedent on constitutional rights in privacy cases"
  );
  console.log(
    "   - Compare holdings from different courts on fair use doctrine"
  );
  console.log();
  console.log("   LEGAL DRAFTING (should use Mastra Drafting Workflow):");
  console.log("   - Draft a non-disclosure agreement for a software company");
  console.log("   - Create a motion to dismiss for lack of jurisdiction");
  console.log();
  console.log("5. For each query, verify:");
  console.log(
    "   ✓ Correct routing (check console logs for [Routing] messages)"
  );
  console.log("   ✓ Response is complete (not empty or truncated)");
  console.log("   ✓ Response is accurate and relevant");
  console.log("   ✓ Response length is appropriate for complexity");
  console.log("   ✓ No errors in console");
  console.log("   ✓ Streaming works smoothly");
  console.log();
  console.log("6. Check console logs for:");
  console.log("   - [Complexity] messages showing detection");
  console.log("   - [Routing] messages showing AI SDK vs Mastra");
  console.log("   - [Mastra] messages showing workflow execution");
  console.log("   - [Usage] messages showing transaction handling");
  console.log();
  console.log("7. Expected response characteristics:");
  console.log();
  console.log("   Simple (AI SDK + QNA):");
  console.log("   - Quick response (< 2 seconds)");
  console.log("   - Concise answer (50-200 characters)");
  console.log("   - Direct definition or explanation");
  console.log();
  console.log("   Light (AI SDK + Advanced Search):");
  console.log("   - Fast response (2-5 seconds)");
  console.log("   - Detailed answer (200-500 characters)");
  console.log("   - Single search with comprehensive info");
  console.log();
  console.log("   Medium (Mastra Medium Agent):");
  console.log("   - Moderate response time (5-10 seconds)");
  console.log("   - Comprehensive answer (500-1000 characters)");
  console.log("   - Multiple searches synthesized");
  console.log();
  console.log("   Deep (Mastra Deep Workflow):");
  console.log("   - Longer response time (10-20 seconds)");
  console.log("   - Thorough analysis (1000+ characters)");
  console.log("   - Multi-step: search → extract → analyze");
  console.log();
  console.log("   Workflow (Mastra Workflows):");
  console.log("   - Extended response time (15-30 seconds)");
  console.log("   - Structured output (1000+ characters)");
  console.log("   - Multi-agent collaboration visible");
  console.log();
  console.log("8. Test with ENABLE_MASTRA=false:");
  console.log("   - All queries should use AI SDK");
  console.log("   - Medium/Deep/Workflow queries should still work");
  console.log("   - Responses may be less structured");
  console.log();
  console.log("=".repeat(80));
  console.log();
}

function printTestSummary() {
  console.log("=".repeat(80));
  console.log("📝 TEST QUERY SUMMARY");
  console.log("=".repeat(80));
  console.log();

  const categories = Array.from(new Set(testQueries.map((q) => q.category)));

  for (const category of categories) {
    const queries = testQueries.filter((q) => q.category === category);
    console.log(`${category} (${queries.length} queries):`);
    for (const query of queries) {
      console.log(`  - ${query.query}`);
      console.log(
        `    Expected: ${query.expectedComplexity} -> ${query.expectedRoute}`
      );
    }
    console.log();
  }

  console.log("=".repeat(80));
  console.log();
}

// Run tests
console.log();
printTestSummary();
const results = testComplexityDetection();
printManualTestingInstructions();

// Exit with appropriate code
process.exit(results.failCount > 0 ? 1 : 0);
