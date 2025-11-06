/**
 * Manual test script for Advanced Search Workflow
 * Run with: npx tsx scripts/test-advanced-search-workflow.ts
 */

import { advancedSearchWorkflow } from "../mastra/workflows/advanced-search-workflow";

async function testAdvancedSearchWorkflow() {
  console.log("Testing Advanced Search Workflow...\n");

  try {
    const run = await advancedSearchWorkflow.createRunAsync();

    console.log("Starting workflow with test query...");
    const startTime = Date.now();

    const result = await run.start({
      inputData: {
        query: "What are the requirements for company registration?",
        jurisdiction: "Zimbabwe",
      },
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\n=== Workflow Results ===");
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);

    if (result.status === "success") {
      // Check advanced-search step
      const searchOutput = result.steps["advanced-search"]?.output;
      console.log("\n--- Advanced Search Step ---");
      console.log(`Results: ${searchOutput.totalResults}`);
      console.log(`Token Estimate: ${searchOutput.tokenEstimate}`);

      // Check extract-top-sources step
      const extractOutput = result.steps["extract-top-sources"]?.output;
      console.log("\n--- Extract Top Sources Step ---");
      console.log(`Skipped: ${extractOutput.skipped}`);
      console.log(`Extractions: ${extractOutput.extractions.length}`);
      console.log(`Extraction Tokens: ${extractOutput.extractionTokens}`);

      // Check synthesize step
      const synthesisOutput = result.steps.synthesize?.output;
      console.log("\n--- Synthesize Step ---");
      console.log(`Response Length: ${synthesisOutput.response.length} chars`);
      console.log(`Sources: ${synthesisOutput.sources.length}`);
      console.log(`Total Tokens: ${synthesisOutput.totalTokens}`);

      // Verify token budget (4K-8K)
      if (
        synthesisOutput.totalTokens >= 4000 &&
        synthesisOutput.totalTokens <= 8000
      ) {
        console.log("\n✅ Token budget within range (4K-8K)");
      } else {
        console.log(
          `\n⚠️  Token budget outside range: ${synthesisOutput.totalTokens} tokens`
        );
      }

      // Verify all steps executed
      if (
        result.steps["advanced-search"] &&
        result.steps["extract-top-sources"] &&
        result.steps.synthesize
      ) {
        console.log("✅ All three steps executed successfully");
      }

      // Show first 200 chars of response
      console.log("\n--- Response Preview ---");
      console.log(synthesisOutput.response.substring(0, 200) + "...");
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
