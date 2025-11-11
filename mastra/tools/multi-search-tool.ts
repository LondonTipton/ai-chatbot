import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { multiSearchWorkflow } from "../workflows/multi-search-workflow";

/**
 * Multi-Search Tool
 *
 * Handles broad queries by breaking them into 2-3 focused searches.
 * Prevents keyword soup and improves result quality.
 *
 * Token Budget: 4K-8K tokens
 * Latency: 6-12 seconds
 *
 * Use cases:
 * - Broad queries covering multiple topics
 * - "What case law supports Labour Act protections?"
 * - "Tell me about employment rights in Zimbabwe"
 * - Queries with 3+ distinct topics
 *
 * Strategy:
 * 1. Detect if query is broad (multiple topics)
 * 2. If broad: decompose into 2-3 focused sub-queries
 * 3. Search each sub-query separately (5 results each)
 * 4. Combine and synthesize results
 *
 * Examples:
 * - "What case law supports Labour Act protections?"
 *   → Search 1: "Labour Act unfair dismissal case law Zimbabwe"
 *   → Search 2: "Labour Act minimum wage case law Zimbabwe"
 *   → Search 3: "Labour Act trade union rights case law Zimbabwe"
 */
export const multiSearchTool = createTool({
  id: "multi-search",
  description:
    "Advanced multi-search for broad queries covering multiple topics. " +
    "Automatically breaks down broad queries into 2-3 focused searches to avoid confusion. " +
    "Use for: queries with multiple topics, comprehensive overviews, 'what case law supports X' questions. " +
    "Performs 1-3 targeted searches (5 results each) and synthesizes results. " +
    "Speed: 6-12 seconds | Tokens: 4-8K | Best for: Broad queries that would produce keyword soup. " +
    "NOT for: Single focused queries (use standardResearch or deepResearch instead).",

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The broad research query covering multiple topics or protections"
      ),
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
    response: z.string().describe("Comprehensive synthesized response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("All unique sources cited"),
    totalTokens: z.number().describe("Total tokens used"),
    searchCount: z.number().describe("Number of searches performed"),
  }),

  execute: async (executionContext: any) => {
    const { context } = executionContext;
    const {
      query,
      jurisdiction = "Zimbabwe",
      conversationHistory: providedHistory = [],
    } = context;

    // Extract conversation history from agentContext if not provided
    const conversationHistory =
      providedHistory.length > 0
        ? providedHistory
        : executionContext?.agentContext?.conversationHistory || [];

    console.log(`[Multi-Search Tool] Starting workflow for query: "${query}"`);
    console.log(
      `[Multi-Search Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      const run = await multiSearchWorkflow.createRunAsync();
      console.log(
        "[Multi-Search Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
        },
      });

      console.log(
        `[Multi-Search Tool] Workflow completed with status: ${result.status}`
      );

      if (result.status !== "success") {
        console.error(
          `[Multi-Search Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Multi-search workflow failed with status: ${result.status}`
        );
      }

      // Extract output from synthesize step
      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Multi-Search Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      // Get search count from decompose step
      const decomposeStep = result.steps.decompose;
      const searchCount =
        (decomposeStep?.output as any)?.subQueries?.length || 1;

      console.log(
        `[Multi-Search Tool] Successfully completed. Searches: ${searchCount}, Sources: ${output.sources.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
        searchCount,
      };
    } catch (error) {
      console.error("[Multi-Search Tool] Error executing workflow:", error);

      return {
        response:
          "I encountered an error while researching your question. Please try rephrasing your query or breaking it into more specific questions.",
        sources: [],
        totalTokens: 0,
        searchCount: 0,
      };
    }
  },
});
