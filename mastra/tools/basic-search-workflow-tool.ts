import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { basicSearchWorkflow } from "../workflows/basic-search-workflow";

/**
 * Basic Search Workflow Tool
 *
 * Wraps the Basic Search Workflow as a Mastra tool for simple queries.
 * This tool executes the workflow (search → synthesize) and returns results.
 *
 * Token Budget: 1K-2.5K tokens
 * Latency: 3-5 seconds
 *
 * Use this tool when:
 * - User asks simple factual questions
 * - Query requires quick research with few sources
 * - Speed is more important than depth
 * - Token budget is limited
 */
export const basicSearchWorkflowTool = createTool({
  id: "basic-search-workflow",
  description:
    "Performs basic legal research with 3 sources and quick synthesis. " +
    "Use this for simple factual questions that need quick answers with citations. " +
    "Returns a synthesized response with source citations. " +
    "Token budget: 1K-2.5K tokens. Best for straightforward queries requiring fast responses.",

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
      `[Basic Search Workflow Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );

    try {
      // Create and execute the workflow
      const run = await basicSearchWorkflow.createRunAsync();
      console.log(
        "[Basic Search Workflow Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
        },
      });

      console.log(
        `[Basic Search Workflow Tool] Workflow completed with status: ${result.status}`
      );

      // Handle workflow failure
      if (result.status !== "success") {
        console.error(
          `[Basic Search Workflow Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Basic search workflow failed with status: ${result.status}`
        );
      }

      // Extract output from the synthesize step (last step in workflow)
      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Basic Search Workflow Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[Basic Search Workflow Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Total tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      // Comprehensive error handling with logging
      console.error(
        "[Basic Search Workflow Tool] Error executing workflow:",
        error
      );

      // Return graceful error message in tool output format
      return {
        response:
          "I encountered an error while researching your question. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});
