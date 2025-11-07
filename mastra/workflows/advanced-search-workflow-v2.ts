/**
 * Advanced Search Workflow V2 (Refactored)
 *
 * Purpose: Deep content analysis with full source text
 * Token Budget: 3K-5K tokens
 * Latency: 3-5s
 * Tavily Credits: 1
 *
 * Use Cases:
 * - Case law analysis
 * - Detailed legal research
 * - Statute interpretation
 * - Queries requiring full source text
 *
 * Tavily Configuration:
 * - maxResults: 10
 * - includeRawContent: true (full source text)
 * - searchDepth: "advanced"
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const searchStep = createStep({
  id: "search",
  description:
    "Perform advanced Tavily search with raw content and format results",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
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
      .describe("Recent conversation history for query enhancement"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Formatted search results with raw content"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations"),
    totalTokens: z.number().describe("Estimated tokens used"),
    rawResults: z.any().optional().describe("Raw Tavily results for debugging"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, conversationHistory } = inputData;

    console.log("[Advanced Search V2] Starting search");
    console.log("[Advanced Search V2] Query:", query);

    try {
      // Import query enhancer
      const { enhanceSearchQuery } = await import(
        "../agents/query-enhancer-agent"
      );

      // Enhance query with conversation context
      const enhancedQuery = await enhanceSearchQuery(
        query,
        conversationHistory || []
      );

      console.log("[Advanced Search V2] Enhanced query:", enhancedQuery);

      // Import Tavily advanced tool
      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );

      // Call Tavily with advanced configuration (includes raw content)
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: enhancedQuery,
          maxResults: 10, // Advanced search: 10 results with full content
          includeRawContent: true, // Full source text for deep analysis
        },
        runtimeContext,
      });

      console.log(
        "[Advanced Search V2] Tavily results:",
        searchResults.results.length
      );

      // Format raw results for Chat Agent (including full content)
      let response = "";

      if (searchResults.results.length > 0) {
        response = `SEARCH RESULTS FOR: "${query}"\n\n`;
        response += `Found ${searchResults.results.length} results with full content:\n\n`;

        searchResults.results.forEach((result: any, i: number) => {
          response += `--- RESULT ${i + 1} ---\n`;
          response += `Title: ${result.title}\n`;
          response += `URL: ${result.url}\n`;
          response += `Relevance Score: ${result.score}\n`;
          response += `Summary:\n${result.content}\n\n`;

          // Include raw content if available (full source text)
          if (result.rawContent) {
            response += `Full Source Text:\n${result.rawContent}\n\n`;
          }
        });

        response += `\nINSTRUCTIONS: Analyze these search results with their full source text and provide a comprehensive, detailed answer to the user's question. Use ALL relevant information from the results above. Cite sources using [Title](URL) format. You have access to the complete source text for deep analysis.`;
      } else {
        response = `No search results found for: "${query}"

This might be because:
- The information is not indexed in available databases
- The query terms might need adjustment
- The information might be in offline resources

I recommend:
- Rephrasing the query
- Checking specialized legal databases
- Consulting with a legal practitioner`;
      }

      // Extract sources for metadata
      const sources = searchResults.results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      console.log("[Advanced Search V2] Search completed");
      console.log("[Advanced Search V2] Response length:", response.length);
      console.log("[Advanced Search V2] Sources:", sources.length);

      return {
        response,
        sources,
        totalTokens: searchResults.tokenEstimate,
        rawResults: searchResults,
      };
    } catch (error) {
      console.error("[Advanced Search V2] Error:", error);

      return {
        response:
          "I encountered an error while searching. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});

export const advancedSearchWorkflowV2 = createWorkflow({
  id: "advanced-search-workflow-v2",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
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
      .describe("Recent conversation history for query enhancement"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Formatted search results with raw content"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations"),
    totalTokens: z.number().describe("Estimated tokens used"),
    rawResults: z.any().optional().describe("Raw Tavily results for debugging"),
  }),
})
  .then(searchStep)
  .commit();
