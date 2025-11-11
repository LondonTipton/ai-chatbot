import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { advancedSearchWorkflowV2 } from "../workflows/advanced-search-workflow-v2";

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
    response: z.string().describe("Synthesized response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z
            .string()
            .optional()
            .describe("Content excerpt from source"),
          score: z.number().optional().describe("Relevance score"),
        })
      )
      .describe("Source citations with excerpts"),
    rawResults: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          score: z.number().optional(),
          publishedDate: z.string().optional(),
        })
      )
      .optional()
      .describe("Original Tavily results for grounding and verification"),
    enhancedQuery: z
      .string()
      .optional()
      .describe("Enhanced query used for search"),
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
      `[Low-Advance Search Workflow Tool] Starting workflow for query: "${query}"`
    );
    console.log(
      `[Low-Advance Search Workflow Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      const run = await advancedSearchWorkflowV2.createRunAsync();
      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
        },
      });

      if (result.status !== "success") {
        throw new Error(
          `Low-advance search workflow failed with status: ${result.status}`
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
        rawResults?: any;
      };

      // Extract raw Tavily results for grounding
      const rawTavilyResults = output.rawResults?.results || [];

      // Enhance sources with content excerpts and scores
      const enhancedSources = output.sources.map((source) => {
        const rawResult = rawTavilyResults.find(
          (r: any) => r.url === source.url
        );
        return {
          title: source.title,
          url: source.url,
          content: rawResult?.content?.substring(0, 500) || "", // First 500 chars
          score: rawResult?.score,
        };
      });

      // Prepare raw results for Chat Agent (limit to top 5 for token efficiency)
      const topRawResults = rawTavilyResults.slice(0, 5).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content || "",
        score: r.score,
        publishedDate: r.published_date,
      }));

      console.log(
        `[Low-Advance Search Workflow Tool] Successfully completed. Sources: ${output.sources.length}, Raw results: ${topRawResults.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: enhancedSources,
        rawResults: topRawResults,
        enhancedQuery: query, // Pass through for context
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
        rawResults: [],
        totalTokens: 0,
      };
    }
  },
});
