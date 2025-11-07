/**
 * Manual test script for Advanced Search Workflow V2
 * Run with: npx tsx scripts/test-advanced-search-workflow.ts
 *
 * V2 Changes:
 * - Uses simplified Tavily integration (raw results → Chat Agent)
 * - No entity extraction/validation
 * - Includes conversation history support
 */

import { advancedSearchWorkflowV2 } from "../mastra/workflows/advanced-search-workflow-v2";

async function testAdvancedSearchWorkflow() {
  console.log("Testing Advanced Search Workflow V2...\n");

  try {
    const run = await advancedSearchWorkflowV2.createRunAsync();

    console.log("Starting workflow with test query...");
    const startTime = Date.now();

    const result = await run.start({
      inputData: {
        query: "What are the requirements for company registration?",
        jurisdiction: "Zimbabwe",
        conversationHistory: [], // Empty for standalone test
      },
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n=== Workflow Results ===");
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);

    if (result.status === "success") {
      // Check search step
      const searchStep = result.steps.search;

      if (searchStep && searchStep.status === "success") {
        const searchOutput = searchStep.output as {
          response: string;
          sources: Array<{ title: string; url: string }>;
          totalTokens: number;
        };

        console.log("\n--- Search Step ---");
        console.log(`Response Length: ${searchOutput.response.length} chars`);
        console.log(`Sources: ${searchOutput.sources.length}`);
        console.log(`Total Tokens: ${searchOutput.totalTokens}`);

        // Verify token budget (3K-5K for V2)
        if (
          searchOutput.totalTokens >= 3000 &&
          searchOutput.totalTokens <= 5000
        ) {
          console.log("\n✅ Token budget within range (3K-5K)");
        } else {
          console.log(
            `\n⚠️  Token budget outside range: ${searchOutput.totalTokens} tokens`
          );
        }

        console.log("✅ Search step executed successfully");

        // Show first 200 chars of response
        console.log("\n--- Response Preview ---");
        console.log(`${searchOutput.response.substring(0, 200)}...`);

        // Show sources
        console.log("\n--- Sources ---");
        searchOutput.sources.slice(0, 3).forEach((source, i) => {
          console.log(`${i + 1}. ${source.title}`);
          console.log(`   ${source.url}`);
        });
        if (searchOutput.sources.length > 3) {
          console.log(`   ... and ${searchOutput.sources.length - 3} more`);
        }
      } else {
        console.error("\n❌ Search step failed");
        console.error(searchStep);
      }
    } else {
      console.error("\n❌ Workflow failed");
      console.error(result);
    }
  } catch (error) {
    console.error("\n❌ Error running workflow:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testAdvancedSearchWorkflow()
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });
