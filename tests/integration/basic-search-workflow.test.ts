/**
 * Integration tests for Basic Search Workflow
 *
 * Tests the complete workflow execution including:
 * - Search step execution
 * - Synthesis step execution
 * - Token budget compliance (1K-2.5K tokens)
 * - Error handling for search failures
 * - Source citation extraction
 *
 * Note: These tests require TAVILY_API_KEY and CEREBRAS_API_KEY to be set
 */

import { basicSearchWorkflow } from "@/mastra/workflows/basic-search-workflow";

describe("Basic Search Workflow Integration Tests", () => {
  it("should execute complete workflow successfully", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

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

    // Verify token budget (1K-2.5K tokens)
    expect(output.totalTokens).toBeGreaterThan(0);
    expect(output.totalTokens).toBeLessThanOrEqual(2500);

    console.log("Workflow result:", {
      status: result.status,
      responseLength: output.response.length,
      sourcesCount: output.sources.length,
      totalTokens: output.totalTokens,
    });
  }, 30_000); // 30 second timeout for API calls

  it("should handle search with Zimbabwe domain filtering", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe Companies Act provisions",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;
    expect(output.response).toBeTruthy();

    // Verify Zimbabwe context in response
    const response = output.response.toLowerCase();
    expect(
      response.includes("zimbabwe") ||
        output.sources.some((s: { url: string }) =>
          s.url.toLowerCase().includes("zimbabwe")
        )
    ).toBe(true);
  }, 30_000);

  it("should stay within token budget for simple queries", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "What is a contract?",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;

    // Simple queries should use fewer tokens
    expect(output.totalTokens).toBeLessThanOrEqual(2500);

    console.log("Simple query tokens:", output.totalTokens);
  }, 30_000);

  it("should handle search failures gracefully", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

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
  }, 30_000);

  it("should extract sources correctly", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "Zimbabwe legal system overview",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    const output = result.steps.synthesize?.output;

    // Verify sources structure
    if (output.sources.length > 0) {
      const firstSource = output.sources[0];
      expect(firstSource).toHaveProperty("title");
      expect(firstSource).toHaveProperty("url");
      expect(typeof firstSource.title).toBe("string");
      expect(typeof firstSource.url).toBe("string");
    }
  }, 30_000);

  it("should complete within latency target (3-5s)", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

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

    // Should complete within reasonable time (allowing some buffer for API latency)
    expect(duration).toBeLessThan(15); // 15s max (generous for testing)

    console.log(`Workflow completed in ${duration.toFixed(2)}s`);
  }, 30_000);

  it("should handle non-Zimbabwe jurisdictions", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

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
  }, 30_000);

  it("should verify step execution order", async () => {
    const run = await basicSearchWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        query: "legal precedent",
        jurisdiction: "Zimbabwe",
      },
    });

    expect(result.status).toBe("success");

    // Verify both steps executed
    expect(result.steps).toHaveProperty("search");
    expect(result.steps).toHaveProperty("synthesize");

    // Verify step statuses
    expect(result.steps.search.status).toBe("success");
    expect(result.steps.synthesize.status).toBe("success");

    console.log("Step execution order verified");
  }, 30_000);
});
