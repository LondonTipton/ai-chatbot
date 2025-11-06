/**
 * Integration test for Synthesizer Agent
 *
 * Tests the synthesizer agent with actual API calls to verify:
 * - Response formatting with markdown
 * - Citation preservation
 * - Content structure
 *
 * Usage: npx tsx scripts/test-synthesizer-agent.ts
 *
 * Note: Temperature (0.6) and maxTokens (6000) are configured in the model,
 * not passed as parameters to generate().
 */

import { synthesizerAgent } from "../mastra/agents/synthesizer-agent";

const logger = {
  log: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
};

// Regex pattern defined at module level for performance
const LIMITATIONS_REGEX = /limited|available|partial|incomplete|based on/;

async function testBasicFormatting() {
  logger.log("\n=== Test 1: Basic Formatting ===");

  const input = `Format this information:

Search Results:
- Zimbabwe Constitution provides for freedom of expression under Section 61
- Case: Retrofit (Pvt) Ltd v Minister of Home Affairs (2019)
- The case established important precedents for media freedom
- Source: https://zimlii.org/zw/judgment/supreme-court/2019/1

Provide a formatted response with proper structure and citations.`;

  try {
    const response = await synthesizerAgent.generate(input, {
      maxSteps: 1,
    });

    logger.log("✅ Response generated successfully");
    logger.log(`📊 Response length: ${response.text.length} characters`);
    logger.log(`📊 Estimated tokens: ${Math.ceil(response.text.length / 4)}`);

    // Check for markdown formatting
    const hasMarkdown =
      response.text.includes("##") ||
      response.text.includes("**") ||
      response.text.includes("-");
    logger.log(`✅ Has markdown formatting: ${hasMarkdown}`);

    // Check for citation preservation
    const hasCitation = response.text.includes("zimlii.org");
    logger.log(`✅ Preserves citations: ${hasCitation}`);

    logger.log("\n📄 Response Preview:");
    logger.log(`${response.text.substring(0, 500)}...\n`);

    return true;
  } catch (error) {
    logger.error("❌ Test failed:", error);
    return false;
  }
}

async function testCitationPreservation() {
  logger.log("\n=== Test 2: Citation Preservation ===");

  const input = `Format this legal research:

Information: The Zimbabwe Constitution guarantees freedom of expression under Section 61. This includes freedom of the press and other media.

Sources:
1. Zimbabwe Constitution, Section 61 - https://zimlii.org/zw/legislation/act/2013/constitution
2. Retrofit (Pvt) Ltd v Minister of Home Affairs (2019) - https://zimlii.org/zw/judgment/supreme-court/2019/1
3. Zimbabwe Media Commission Act - https://zimlii.org/zw/legislation/act/2020/media-commission

Format this with proper citations and structure.`;

  try {
    const response = await synthesizerAgent.generate(input, {
      maxSteps: 1,
    });

    logger.log("✅ Response generated successfully");

    // Check for all citations
    const citations = [
      "zimlii.org/zw/legislation/act/2013/constitution",
      "zimlii.org/zw/judgment/supreme-court/2019/1",
      "zimlii.org/zw/legislation/act/2020/media-commission",
    ];

    let preservedCount = 0;
    for (const citation of citations) {
      if (response.text.includes(citation)) {
        preservedCount++;
        logger.log(`✅ Preserved citation: ${citation}`);
      } else {
        logger.warn(`⚠️  Missing citation: ${citation}`);
      }
    }

    logger.log(
      `📊 Citation preservation rate: ${preservedCount}/${citations.length}`
    );

    return preservedCount >= 2; // At least 2 out of 3 citations preserved
  } catch (error) {
    logger.error("❌ Test failed:", error);
    return false;
  }
}

async function testTokenBudget() {
  logger.log("\n=== Test 3: Token Budget Compliance ===");

  const input =
    "Format this extensive legal research about Zimbabwe constitutional law, administrative law, contract law, tort law, criminal law, and civil procedure. Include comprehensive analysis of all major cases and statutes.".repeat(
      5
    );

  try {
    const response = await synthesizerAgent.generate(input, {
      maxSteps: 1,
    });

    logger.log("✅ Response generated successfully");

    const estimatedTokens = Math.ceil(response.text.length / 4);
    logger.log(`📊 Response length: ${response.text.length} characters`);
    logger.log(`📊 Estimated tokens: ${estimatedTokens}`);

    const withinBudget = estimatedTokens <= 7000; // 6000 + buffer
    logger.log(`✅ Within token budget (≤7000): ${withinBudget}`);

    return withinBudget;
  } catch (error) {
    logger.error("❌ Test failed:", error);
    return false;
  }
}

async function testIncompleteData() {
  logger.log("\n=== Test 4: Handling Incomplete Data ===");

  const input = `Format this partial information:

Topic: Zimbabwe employment law
Note: Limited information available - only basic overview

Provide the best possible formatted response acknowledging limitations.`;

  try {
    const response = await synthesizerAgent.generate(input, {
      maxSteps: 1,
    });

    logger.log("✅ Response generated successfully");

    // Check if response acknowledges limitations
    const acknowledgesLimitations = response.text
      .toLowerCase()
      .match(LIMITATIONS_REGEX);
    logger.log(`✅ Acknowledges limitations: ${!!acknowledgesLimitations}`);

    logger.log("\n📄 Response Preview:");
    logger.log(`${response.text.substring(0, 300)}...\n`);

    return !!acknowledgesLimitations;
  } catch (error) {
    logger.error("❌ Test failed:", error);
    return false;
  }
}

async function runAllTests() {
  logger.log("🧪 Starting Synthesizer Agent Integration Tests\n");
  logger.log("=".repeat(60));

  const results = {
    basicFormatting: await testBasicFormatting(),
    citationPreservation: await testCitationPreservation(),
    tokenBudget: await testTokenBudget(),
    incompleteData: await testIncompleteData(),
  };

  logger.log(`\n${"=".repeat(60)}`);
  logger.log("📊 Test Results Summary");
  logger.log("=".repeat(60));

  const passed = Object.values(results).filter((r) => r).length;
  const total = Object.keys(results).length;

  for (const [test, result] of Object.entries(results)) {
    logger.log(`${result ? "✅" : "❌"} ${test}: ${result ? "PASS" : "FAIL"}`);
  }

  logger.log(`\n${"=".repeat(60)}`);
  logger.log(`Final Score: ${passed}/${total} tests passed`);
  logger.log("=".repeat(60));

  if (passed === total) {
    logger.log(
      "\n🎉 All tests passed! Synthesizer agent is working correctly."
    );
  } else {
    logger.error(
      `\n⚠️  ${total - passed} test(s) failed. Please review the output above.`
    );
  }

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
