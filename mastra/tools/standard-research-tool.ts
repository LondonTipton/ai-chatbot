import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { lowAdvanceSearchWorkflow } from "../workflows/low-advance-search-workflow";

/**
 * Standard Research Tool
 *
 * Single-step workflow for balanced research queries.
 * Executes: 2-3 searches → comprehensive synthesis
 *
 * Search Depth: 2-3 search results
 * Token Budget: 2K-4K tokens
 * Latency: 4-7 seconds
 *
 * Use cases:
 * - "Explain..." requests requiring context
 * - "Tell me about..." queries
 * - "How does..." questions
 * - Overview or comparison queries
 * - Balanced research (speed + quality)
 *
 * Examples:
 * - "Explain the Labour Act provisions on termination"
 * - "Tell me about property transfer procedures in Zimbabwe"
 * - "How does bail work in criminal proceedings?"
 * - "Compare formal vs informal marriages"
 */
export const standardResearchTool = createTool({
  id: "standard-research",
  description:
    "Performs balanced legal research with 2-3 sources and comprehensive synthesis. " +
    "Use this for explanations, overviews, or comparisons that need more context than quick facts. " +
    "Returns a well-rounded response with multiple source citations. " +
    "Token budget: 2K-4K tokens. Best for queries requiring balanced speed and depth.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The research query requiring explanation or comparison"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),

  outputSchema: z.object({
    response: z.string().describe("Comprehensive synthesized response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations (typically 2-3 sources)"),
    totalTokens: z.number().describe("Total tokens used"),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;

    console.log(
      `[Standard Research Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );

    try {
      const run = await lowAdvanceSearchWorkflow.createRunAsync();
      console.log(
        "[Standard Research Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
        },
      });

      console.log(
        `[Standard Research Tool] Workflow completed with status: ${result.status}`
      );

      if (result.status !== "success") {
        console.error(
          `[Standard Research Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Standard research workflow failed with status: ${result.status}`
        );
      }

      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Standard Research Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[Standard Research Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      console.error(
        "[Standard Research Tool] Error executing workflow:",
        error
      );

      return {
        response:
          "I encountered an error while researching your question. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});
