import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { basicSearchWorkflow } from "../workflows/basic-search-workflow";

/**
 * Quick Fact Search Tool
 *
 * Single-step workflow for simple factual lookups.
 * Executes: 1 search → quick synthesis
 *
 * Search Depth: 1 search result
 * Token Budget: 1K-2.5K tokens
 * Latency: 3-5 seconds
 *
 * Use cases:
 * - "What is..." queries (definitions, concepts)
 * - "Define..." requests
 * - "Current/latest..." facts
 * - Simple factual questions
 * - Quick lookups requiring minimal context
 *
 * Examples:
 * - "What is the Consumer Protection Act in Zimbabwe?"
 * - "Define force majeure in contract law"
 * - "What is the current minimum wage in Zimbabwe?"
 */
export const quickFactSearchTool = createTool({
  id: "quick-fact-search",
  description:
    "Performs quick factual lookup with 1 search result and rapid synthesis. " +
    "Use this for simple factual questions, definitions, or current facts that need fast answers. " +
    "Returns a concise response with source citation. " +
    "Token budget: 1K-2.5K tokens. Best for straightforward queries requiring speed over depth.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The factual question or definition request to investigate"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),

  outputSchema: z.object({
    response: z.string().describe("Concise synthesized response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations (typically 1 source)"),
    totalTokens: z.number().describe("Total tokens used"),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;

    console.log(
      `[Quick Fact Search Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );

    try {
      // Create and execute the workflow
      const run = await basicSearchWorkflow.createRunAsync();
      console.log(
        "[Quick Fact Search Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
        },
      });

      console.log(
        `[Quick Fact Search Tool] Workflow completed with status: ${result.status}`
      );

      // Handle workflow failure
      if (result.status !== "success") {
        console.error(
          `[Quick Fact Search Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Quick fact search workflow failed with status: ${result.status}`
        );
      }

      // Extract output from the synthesize step (last step in workflow)
      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Quick Fact Search Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[Quick Fact Search Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Total tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      // Comprehensive error handling with logging
      console.error(
        "[Quick Fact Search Tool] Error executing workflow:",
        error
      );

      // Return graceful error message in tool output format
      return {
        response:
          "I encountered an error while looking up this information. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});
