import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { advancedSearchWorkflow } from "../workflows/advanced-search-workflow";

/**
 * Advanced Search Workflow Tool
 *
 * Wraps the Advanced Search Workflow as a Mastra tool that can be invoked by agents.
 * This tool executes the workflow deterministically (search → extract → synthesize)
 * and returns complete results in a single tool call.
 *
 * Token Budget: 4K-8K tokens
 * Latency: 5-10 seconds
 *
 * Use this tool when:
 * - User asks for comprehensive research on a topic
 * - Query requires multiple perspectives or sources
 * - Question involves case law, precedents, or detailed legal analysis
 * - User explicitly requests "research" or "find cases about"
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export const advancedSearchWorkflowTool = createTool({
  id: "advanced-search-workflow",
  description:
    "Performs advanced legal research with comprehensive sources using web search, content extraction, and synthesis. " +
    "Use this when you need detailed research with multiple authoritative sources and citations. " +
    "Returns a synthesized response with extracted content and source citations. " +
    "Token budget: 4K-8K tokens. Best for queries requiring in-depth research, comparative analysis, or multiple perspectives.",

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
      `[Advanced Search Workflow Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );

    try {
      // Create and execute the workflow
      const run = await advancedSearchWorkflow.createRunAsync();
      console.log(
        "[Advanced Search Workflow Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
        },
      });

      console.log(
        `[Advanced Search Workflow Tool] Workflow completed with status: ${result.status}`
      );

      // Handle workflow failure
      if (result.status !== "success") {
        console.error(
          `[Advanced Search Workflow Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Advanced search workflow failed with status: ${result.status}`
        );
      }

      // Extract output from the synthesize step (last step in workflow)
      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Advanced Search Workflow Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[Advanced Search Workflow Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Total tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      // Comprehensive error handling with logging
      console.error(
        "[Advanced Search Workflow Tool] Error executing workflow:",
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
