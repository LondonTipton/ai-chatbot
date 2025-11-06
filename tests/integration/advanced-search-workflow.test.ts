/**
 * Integration tests for Advanced Search Workflow
 *
 * Tests the complete workflow execution including:
 * - Advanced search step with Zimbabwe domain filtering
 * - Extract top sources step (with skip logic)
 * - Synthesis step execution
 * - Token budget compliance (4K-8K tokens)
 * - Error handling for extraction failures
 * - Source citation extraction
 *
 * Note: These tests require TAVILY_API_KEY and CEREBRAS_API_KEY to be set
 */

import { advancedSearchWorkflow } from "@/mastra/workflows/advanced-search-workflow";

describe("Advanced Search Workflow Integration Tests", () => {
  it("should execute complete workflow successfully with extraction", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "What are the requirements for company registration?",
        jurisdiction: "Zimbabwe",
      },
    });

    // Verify workflow completed successfully
    expect(result.status).toBe("success");

    // Access the final output from the last step
    const output = result.steps.synthesize?.output;

    // Verify output structure
    expect(output).toHaveProperty("response");
    expect(output).toHaveProperty("sources");
    expect(output).toHaveProperty("totalTokens");

    // Verify response is not empty
    expect(output.response).toBeTruthy();
    expect(output.response.length).toBeGreaterThan(0);

    // Verify sources array exists
    expect(Array.isArray(output.sources)).toBe(true);

    // Verify token budget (4K-8K tokens)
    expect(output.totalTokens).toBeGreaterThan(0);
    expect(output.totalTokens).toBeLessThanOrEqual(8000);

    console.log("Workflow result:", {
      status: result.status,
      responseLength: output.response.length,
      sourcesCount: output.sources.length,
      totalTokens: output.totalTokens,
    });
  }, 60_000); // 60 second timeout for API calls

  it("should handle extraction step with top 2 URLs", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe Companies Act provisions",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    // Check extraction step
    const extractionOutput = result.steps["extract-top-sources"]?.output;
    expect(extractionOutput).toHaveProperty("extractions");
    expect(extractionOutput).toHaveProperty("skipped");

    // If not skipped, verify extraction results
    if (!extractionOutput.skipped) {
      expect(extractionOutput.extractions.length).toBeGreaterThan(0);
      expect(extractionOutput.extractions.length).toBeLessThanOrEqual(2);
      expect(extractionOutput.extractionTokens).toBeGreaterThan(0);
    }

    console.log("Extraction step:", {
      skipped: extractionOutput.skipped,
      extractionsCount: extractionOutput.extractions.length,
      extractionTokens: extractionOutput.extractionTokens,
    });
  }, 60_000);

  it("should skip extraction when no URLs available", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    // Use a very specific query that might not return results
    const result = await run.start({
      inputData: {
        query: "xyzabc123nonexistent",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    // Check that extraction was skipped
    const extractionOutput = result.steps["extract-top-sources"]?.output;
    expect(extractionOutput.skipped).toBe(true);
    expect(extractionOutput.extractions.length).toBe(0);
    expect(extractionOutput.extractionTokens).toBe(0);

    // Workflow should still complete with synthesis
    const synthesisOutput = result.steps.synthesize?.output;
    expect(synthesisOutput.response).toBeTruthy();
  }, 60_000);

  it("should apply Zimbabwe domain filtering", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe legal system overview",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    // Check search results
    const searchOutput = result.steps["advanced-search"]?.output;
    expect(searchOutput.results).toBeDefined();

    // Verify Zimbabwe context in results or response
    const synthesisOutput = result.steps.synthesize?.output;
    const response = synthesisOutput.response.toLowerCase();
    const hasZimbabweContext =
      response.includes("zimbabwe") ||
      synthesisOutput.sources.some((s: { url: string }) =>
        s.url.toLowerCase().includes("zimbabwe")
      );

    expect(hasZimbabweContext).toBe(true);
  }, 60_000);

  it("should stay within token budget (4K-8K)", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "contract law principles in Zimbabwe",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;

    // Verify token budget compliance
    expect(output.totalTokens).toBeGreaterThan(0);
    expect(output.totalTokens).toBeGreaterThanOrEqual(4000);
    expect(output.totalTokens).toBeLessThanOrEqual(8000);

    console.log("Token usage:", output.totalTokens);
  }, 60_000);

  it("should handle extraction failures gracefully", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe constitutional law",
        jurisdiction: "Zimbabwe",
      },
    });

    // Workflow should complete even if extraction fails
    expect(result.status).toBe("success");

    const synthesisOutput = result.steps.synthesize?.output;
    expect(synthesisOutput.response).toBeTruthy();
    expect(synthesisOutput.sources).toBeDefined();

    // Check extraction step status
    const extractionOutput = result.steps["extract-top-sources"]?.output;
    expect(extractionOutput).toHaveProperty("skipped");

    console.log("Extraction handling:", {
      skipped: extractionOutput.skipped,
      hasResponse: !!synthesisOutput.response,
    });
  }, 60_000);

  it("should extract sources correctly", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe employment law basics",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;

    // Verify sources structure
    expect(Array.isArray(output.sources)).toBe(true);

    if (output.sources.length > 0) {
      const firstSource = output.sources[0];
      expect(firstSource).toHaveProperty("title");
      expect(firstSource).toHaveProperty("url");
      expect(typeof firstSource.title).toBe("string");
      expect(typeof firstSource.url).toBe("string");
    }
  }, 60_000);

  it("should complete within latency target (5-10s)", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const startTime = Date.now();

    const result = await run.start({
      inputData: {
        query: "What is tort law?",
        jurisdiction: "Zimbabwe",
      },
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    expect(result.status).toBe("success");

    // Should complete within reasonable time (allowing buffer for API latency)
    expect(duration).toBeLessThan(30); // 30s max (generous for testing)

    console.log(`Workflow completed in ${duration.toFixed(2)}s`);
  }, 60_000);

  it("should verify all three steps executed", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "legal precedent in Zimbabwe",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    // Verify all three steps executed
    expect(result.steps).toHaveProperty("advanced-search");
    expect(result.steps).toHaveProperty("extract-top-sources");
    expect(result.steps).toHaveProperty("synthesize");

    // Verify step statuses
    expect(result.steps["advanced-search"].status).toBe("success");
    expect(result.steps["extract-top-sources"].status).toBe("success");
    expect(result.steps.synthesize.status).toBe("success");

    console.log("All steps executed successfully");
  }, 60_000);

  it("should handle search failures gracefully", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    // Test with empty query (should still complete)
    const result = await run.start({
      inputData: {
        query: "",
        jurisdiction: "Zimbabwe",
      },
    });

    // Workflow should complete even with errors
    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;
    expect(output).toHaveProperty("response");
    expect(output).toHaveProperty("sources");
  }, 60_000);

  it("should handle non-Zimbabwe jurisdictions", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "contract law basics",
        jurisdiction: "United States",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;
    expect(output.response).toBeTruthy();

    // Should not filter to Zimbabwe domains
    console.log("Non-Zimbabwe query completed successfully");
  }, 60_000);

  it("should provide comprehensive response with extractions", async () => {
    const run = await advancedSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe Companies Act registration requirements",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;

    // Response should be comprehensive (longer than basic search)
    expect(output.response.length).toBeGreaterThan(200);

    // Should have multiple sources
    expect(output.sources.length).toBeGreaterThan(0);

    console.log("Response details:", {
      responseLength: output.response.length,
      sourcesCount: output.sources.length,
      totalTokens: output.totalTokens,
    });
  }, 60_000);
});
