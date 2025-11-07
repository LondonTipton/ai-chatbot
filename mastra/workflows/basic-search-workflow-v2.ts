/**
 * Basic Search Workflow V2 (Refactored)
 *
 * Purpose: Fast, lightweight queries for simple questions
 * Token Budget: 1K-2K tokens
 * Latency: 2-3s
 * Tavily Credits: 1
 *
 * Use Cases:
 * - "What is X?" queries
 * - Definitions
 * - Quick factual lookups
 *
 * Tavily Configuration:
 * - maxResults: 10
 * - includeRawContent: false (saves tokens)
 * - searchDepth: "basic"
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const searchStep = createStep({
  id: "search",
  description: "Perform basic Tavily search and format raw results",
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
    response: z.string().describe("Formatted search results"),
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

    console.log("[Basic Search V2] Starting search");
    console.log("[Basic Search V2] Query:", query);

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

      console.log("[Basic Search V2] Enhanced query:", enhancedQuery);

      // Import Tavily tool
      const { tavilySearchTool } = await import("../tools/tavily-search");

      // Call Tavily with basic configuration
      const searchResults = await tavilySearchTool.execute({
        context: {
          query: enhancedQuery,
          maxResults: 10, // Basic search: 10 results
        },
        runtimeContext,
      });

      console.log(
        "[Basic Search V2] Tavily results:",
        searchResults.results.length
      );

      // Format raw results for Chat Agent
      let response = "";

      if (searchResults.results.length > 0) {
        response = `SEARCH RESULTS FOR: "${query}"\n\n`;
        response += `Found ${searchResults.results.length} results:\n\n`;

        searchResults.results.forEach((result: any, i: number) => {
          response += `--- RESULT ${i + 1} ---\n`;
          response += `Title: ${result.title}\n`;
          response += `URL: ${result.url}\n`;
          response += `Relevance Score: ${result.score}\n`;
          response += `Content:\n${result.content}\n\n`;
        });

        response += `\nINSTRUCTIONS: Analyze these search results and provide a comprehensive answer to the user's question. Use ALL relevant information from the results above. Cite sources using [Title](URL) format.`;
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

      console.log("[Basic Search V2] Search completed");
      console.log("[Basic Search V2] Response length:", response.length);
      console.log("[Basic Search V2] Sources:", sources.length);

      return {
        response,
        sources,
        totalTokens: searchResults.tokenEstimate,
        rawResults: searchResults,
      };
    } catch (error) {
      console.error("[Basic Search V2] Error:", error);

      return {
        response:
          "I encountered an error while searching. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});

export const basicSearchWorkflowV2 = createWorkflow({
  id: "basic-search-workflow-v2",
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
    response: z.string().describe("Formatted search results"),
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
