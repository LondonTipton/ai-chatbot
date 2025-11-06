import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { highAdvanceSearchWorkflow } from "../workflows/high-advance-search-workflow";

/**
 * High-Advance Search Workflow Tool
 *
 * Wraps the High-Advance Search Workflow as a Mastra tool.
 * This tool executes the workflow (search 10 results → synthesize) and returns results.
 *
 * Token Budget: 5K-10K tokens
 * Latency: 8-15 seconds
 *
 * Use this tool when:
 * - Query requires maximum source coverage
 * - Multiple perspectives needed
 * - Comprehensive analysis without full extraction
 * - Higher token budget acceptable
 */
export const highAdvanceSearchWorkflowTool = createTool({
  id: "high-advance-search-workflow",
  description:
    "Performs comprehensive legal research with 10 sources and detailed synthesis. " +
    "Use this for complex queries requiring maximum source coverage and multiple perspectives. " +
    "Returns a synthesized response with extensive source citations. " +
    "Token budget: 5K-10K tokens. Best for comprehensive research queries.",

  inputSchema: z.object({
    query: z.string().describe("The research query to investigate"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),

  outputSchema: z.object({
    response: z.string().describe("Synthesized comprehensive response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations"),
    totalTokens: z.number().describe("Total tokens used"),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;

    console.log(
      `[High-Advance Search Workflow Tool] Starting workflow for query: "${query}"`
    );

    try {
      const run = await highAdvanceSearchWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
        },
      });

      if (result.status !== "success") {
        throw new Error(
          `High-advance search workflow failed with status: ${result.status}`
        );
      }

      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[High-Advance Search Workflow Tool] Successfully completed. Sources: ${output.sources.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      console.error(
        "[High-Advance Search Workflow Tool] Error executing workflow:",
        error
      );

      return {
        response:
          "I encountered an error while researching your question. Please try again.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});
