import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { highAdvanceSearchWorkflowV2 } from "../workflows/high-advance-search-workflow-v2";

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
    conversationHistory: z
      .array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      )
      .optional()
      .default([])
      .describe("Recent conversation history for context"),
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

  execute: async (executionContext: any) => {
    const { context } = executionContext;
    const {
      query,
      jurisdiction = "Zimbabwe",
      conversationHistory: providedHistory = [],
    } = context;

    // Extract conversation history from agentContext if not provided in context
    // Priority: context.conversationHistory > agentContext.conversationHistory > empty array
    const conversationHistory =
      providedHistory.length > 0
        ? providedHistory
        : executionContext?.agentContext?.conversationHistory || [];

    console.log(
      `[High-Advance Search Workflow Tool] Starting workflow for query: "${query}"`
    );
    console.log(
      `[High-Advance Search Workflow Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      const run = await highAdvanceSearchWorkflowV2.createRunAsync();
      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
        },
      });

      if (result.status !== "success") {
        throw new Error(
          `High-advance search workflow failed with status: ${result.status}`
        );
      }

      const searchStep = result.steps.search;

      if (!searchStep || searchStep.status !== "success") {
        throw new Error("Search step failed or not found");
      }

      const output = searchStep.output as {
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
