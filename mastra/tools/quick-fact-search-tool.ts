import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { basicSearchWorkflowV2 } from "../workflows/basic-search-workflow-v2";

/**
 * Quick Fact Search Tool
 *
 * Single-step workflow for simple factual lookups.
 * Executes: 1 search → quick synthesis
 *
 * Search Depth: 1 search result
 * Token Budget: 500-1500 tokens
 * Latency: 2-4 seconds
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
    "Fast factual lookup for simple questions and definitions. " +
    "Use for: 'What is...', 'Define...', 'When was...', single-fact queries. " +
    "Analyzes 10 search results and returns concise answer with source citations. " +
    "Speed: 2-3 seconds | Tokens: 1-2K | Best for: Quick answers requiring speed over depth. " +
    "NOT for: Detailed analysis or trend identification (use standardResearch or deepResearch instead).",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The factual question or definition request to investigate"),
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
    response: z.string().describe("Concise synthesized response"),
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
      `[Quick Fact Search Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );
    console.log(
      `[Quick Fact Search Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      // Create and execute the V2 workflow
      const run = await basicSearchWorkflowV2.createRunAsync();
      console.log(
        "[Quick Fact Search Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
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

      // Extract output from the search step (V2 workflow)
      const searchStep = result.steps.search;

      if (!searchStep || searchStep.status !== "success") {
        console.error(
          `[Quick Fact Search Tool] Search step failed or not found. Step status: ${searchStep?.status}`
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

      // Prepare raw results for Chat Agent (limit to top 3 for quick searches)
      const topRawResults = rawTavilyResults.slice(0, 3).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content || "",
        score: r.score,
        publishedDate: r.published_date,
      }));

      console.log(
        `[Quick Fact Search Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Raw results: ${topRawResults.length}, Total tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: enhancedSources,
        rawResults: topRawResults,
        enhancedQuery: query, // Pass through for context
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
        rawResults: [],
        totalTokens: 0,
      };
    }
  },
});
