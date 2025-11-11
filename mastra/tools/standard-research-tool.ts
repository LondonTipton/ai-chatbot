import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { advancedSearchWorkflowV2 } from "../workflows/advanced-search-workflow-v2";

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
    "Balanced research for explanations and overviews with full source content. " +
    "Use for: 'Explain...', 'Tell me about...', 'How does...', overview queries. " +
    "Analyzes 10 search results WITH complete source text for comprehensive understanding. " +
    "Speed: 3-5 seconds | Tokens: 3-5K | Best for: Balanced depth and speed with detailed sources. " +
    "NOT for: Simple definitions (use quickFactSearch) or trend analysis (use comprehensiveResearch).",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The research query requiring explanation or comparison"),
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
      `[Standard Research Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );
    console.log(
      `[Standard Research Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      const run = await advancedSearchWorkflowV2.createRunAsync();
      console.log(
        "[Standard Research Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
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

      const searchStep = result.steps.search;

      if (!searchStep || searchStep.status !== "success") {
        console.error(
          `[Standard Research Tool] Search step failed or not found. Step status: ${searchStep?.status}`
        );
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
        `[Standard Research Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Raw results: ${topRawResults.length}, Tokens: ${output.totalTokens}`
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
        "[Standard Research Tool] Error executing workflow:",
        error
      );

      return {
        response:
          "I encountered an error while researching your question. Please try rephrasing your query or try again later.",
        sources: [],
        rawResults: [],
        totalTokens: 0,
      };
    }
  },
});
