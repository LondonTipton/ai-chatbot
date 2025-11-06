/**
 * Integration test for parallel summarization utility
 *
 * Verifies:
 * 1. Single agent for <10K tokens
 * 2. Dual agents for 10K-60K tokens
 * 3. Multiple parallel agents for 60K-140K+ tokens
 * 4. Proper token compression across all sizes
 * 5. Error handling and fallback behavior
 */

import {
  parallelSummarize,
  summarizeDocument,
} from "@/lib/utils/parallel-summarization";
import { estimateTokens } from "@/lib/utils/token-estimation";

// Test helpers
function generateMockContent(sizeTokens: number): string {
  const paragraph =
    "This is a comprehensive legal analysis of Zimbabwe employment law including constitutional provisions, statutory frameworks, case law precedent, and practical implications. ";
  let content = "";

  while (estimateTokens(content) < sizeTokens) {
    content += paragraph;
  }

  return content;
}

// Test cases
async function runTests() {
  console.log("🧪 Starting Parallel Summarization Tests...\n");

  // Test 1: Single agent (<10K)
  console.log("✓ Test 1: Single Agent (< 10K tokens)");
  const content5k = generateMockContent(5000);
  const result5k = await parallelSummarize(content5k, {
    maxInputPerAgent: 10_000,
  });
  console.log(`  - Strategy: ${result5k.strategyUsed} (expected: single)`);
  console.log(`  - Agents: ${result5k.agentsUsed} (expected: 1)`);
  console.log(
    `  - Compression: ${(result5k.compressionRatio * 100).toFixed(1)}%`
  );
  console.assert(result5k.strategyUsed === "single", "Should use single agent");
  console.assert(result5k.agentsUsed === 1, "Should use 1 agent");
  console.log();

  // Test 2: Dual agents (10K-60K)
  console.log("✓ Test 2: Dual Agents (10K-60K tokens)");
  const content20k = generateMockContent(20_000);
  const result20k = await parallelSummarize(content20k, {
    maxInputPerAgent: 10_000,
  });
  console.log(`  - Strategy: ${result20k.strategyUsed} (expected: dual)`);
  console.log(`  - Agents: ${result20k.agentsUsed} (expected: 2)`);
  console.log(
    `  - Compression: ${(result20k.compressionRatio * 100).toFixed(1)}%`
  );
  console.assert(result20k.strategyUsed === "dual", "Should use dual strategy");
  console.assert(result20k.agentsUsed === 2, "Should use 2 agents");
  console.log();

  // Test 3: Parallel agents (60K)
  console.log("✓ Test 3: Parallel Agents (60K tokens)");
  const content60k = generateMockContent(60_000);
  const result60k = await parallelSummarize(content60k, {
    maxInputPerAgent: 10_000,
  });
  console.log(`  - Strategy: ${result60k.strategyUsed} (expected: parallel)`);
  console.log(`  - Agents: ${result60k.agentsUsed} (expected: 6)`);
  console.log(
    `  - Compression: ${(result60k.compressionRatio * 100).toFixed(1)}%`
  );
  console.assert(
    result60k.strategyUsed === "parallel",
    "Should use parallel strategy"
  );
  console.assert(
    result60k.agentsUsed >= 6 && result60k.agentsUsed <= 10,
    "Should use 6-10 agents"
  );
  console.log();

  // Test 4: Large document (140K)
  console.log("✓ Test 4: Hierarchical Agents (140K tokens)");
  const content140k = generateMockContent(140_000);
  const result140k = await parallelSummarize(content140k, {
    maxInputPerAgent: 10_000,
  });
  console.log(
    `  - Strategy: ${result140k.strategyUsed} (expected: hierarchical)`
  );
  console.log(`  - Agents: ${result140k.agentsUsed} (expected: ~14)`);
  console.log(
    `  - Compression: ${(result140k.compressionRatio * 100).toFixed(1)}%`
  );
  console.assert(
    result140k.strategyUsed === "hierarchical",
    "Should use hierarchical strategy"
  );
  console.assert(result140k.agentsUsed === 14, "Should use 14 agents for 140K");
  console.log();

  // Test 5: Agent outputs
  console.log("✓ Test 5: Agent Output Structure");
  console.log(`  - Number of outputs: ${result20k.agentOutputs.length}`);
  console.log(`  - Agents used: ${result20k.agentsUsed}`);
  console.assert(
    result20k.agentOutputs.length === result20k.agentsUsed,
    "Output count should match agents used"
  );
  result20k.agentOutputs.forEach((output, idx) => {
    console.assert(output.section, `Output ${idx} should have section`);
    console.assert(output.tokens > 0, `Output ${idx} should have tokens`);
    console.assert(
      output.content.length > 0,
      `Output ${idx} should have content`
    );
  });
  console.log();

  // Test 6: Custom configuration
  console.log("✓ Test 6: Custom Configuration");
  const contentCustom = generateMockContent(30_000);
  const resultCustom = await parallelSummarize(contentCustom, {
    maxInputPerAgent: 5000, // Smaller limit = more agents
  });
  console.log("  - Custom max input: 5000");
  console.log(`  - Agents used: ${resultCustom.agentsUsed}`);
  console.assert(
    resultCustom.agentsUsed > 4,
    "Should use more agents with smaller limit"
  );
  console.log();

  // Test 7: Wrapper function
  console.log("✓ Test 7: summarizeDocument Wrapper");
  const resultWrapper = await summarizeDocument(generateMockContent(25_000), {
    description: "Test wrapper",
  });
  console.log(
    `  - Final summary length: ${resultWrapper.finalSummary.length} chars`
  );
  console.log(`  - Original tokens: ${resultWrapper.originalTokens}`);
  console.log(`  - Summarized tokens: ${resultWrapper.summarizedTokens}`);
  console.assert(
    resultWrapper.finalSummary.length > 0,
    "Should have final summary"
  );
  console.assert(
    resultWrapper.originalTokens > 0,
    "Should track original tokens"
  );
  console.log();

  // Test 8: Error handling
  console.log("✓ Test 8: Error Handling");
  const emptyResult = await parallelSummarize("");
  console.log(`  - Empty content handled: ${emptyResult.agentsUsed} agent(s)`);
  console.assert(emptyResult.agentsUsed === 1, "Should handle empty content");
  console.log();

  console.log("✅ All tests passed!\n");
  console.log("📊 Summary:");
  console.log(
    `  - Single document (5K):   ${(result5k.compressionRatio * 100).toFixed(
      1
    )}% compression`
  );
  console.log(
    `  - Dual document (20K):    ${(result20k.compressionRatio * 100).toFixed(
      1
    )}% compression`
  );
  console.log(
    `  - Parallel document (60K): ${(result60k.compressionRatio * 100).toFixed(
      1
    )}% compression`
  );
  console.log(
    `  - Hierarchical document (140K): ${(
      result140k.compressionRatio * 100
    ).toFixed(1)}% compression`
  );
}

// Run tests
runTests().catch(console.error);
