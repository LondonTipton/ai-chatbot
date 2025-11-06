import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { lowAdvanceSearchWorkflow } from "../workflows/low-advance-search-workflow";

/**
 * Low-Advance Search Workflow Tool
 *
 * Wraps the Low-Advance Search Workflow as a Mastra tool.
 * This tool executes the workflow (search 5 results → synthesize) and returns results.
 *
 * Token Budget: 2K-4K tokens
 * Latency: 4-7 seconds
 *
 * Use this tool when:
 * - Query needs more depth than basic (3 results) but not full advanced (7 results)
 * - Moderate research with balanced speed/quality
 * - Multiple sources needed but not extensive extraction
 */
export const lowAdvanceSearchWorkflowTool = createTool({
  id: "low-advance-search-workflow",
  description:
    "Performs moderate legal research with 5 sources and comprehensive synthesis. " +
    "Use this for queries that need more depth than basic search but faster than full advanced. " +
    "Returns a synthesized response with source citations. " +
    "Token budget: 2K-4K tokens. Best for balanced research queries.",

  inputSchema: z.object({
    query: z.string().describe("The research query to investigate"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),

  outputSchema: z.object({
    response: z.string().describe("Synthesized response"),
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
      `[Low-Advance Search Workflow Tool] Starting workflow for query: "${query}"`
    );

    try {
      const run = await lowAdvanceSearchWorkflow.createRunAsync();
      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
        },
      });

      if (result.status !== "success") {
        throw new Error(
          `Low-advance search workflow failed with status: ${result.status}`
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
        `[Low-Advance Search Workflow Tool] Successfully completed. Sources: ${output.sources.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      console.error(
        "[Low-Advance Search Workflow Tool] Error executing workflow:",
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
