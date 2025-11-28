/**
 * High-Advanced Search Workflow V2 (Refactored)
 *
 * Purpose: Pattern and trend analysis across many sources
 * Token Budget: 2K-4K tokens
 * Latency: 4-6s
 * Tavily Credits: 1
 *
 * Use Cases:
 * - "What are trends in..." queries
 * - Comparative analysis across sources
 * - Pattern identification
 * - Broad overview with multiple perspectives
 *
 * Tavily Configuration:
 * - maxResults: 20
 * - includeRawContent: false (summaries only for breadth)
 * - searchDepth: "advanced"
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const searchStep = createStep({
  id: "search",
  description:
    "Perform high-advanced Tavily search with 20 results for pattern analysis",
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
    response: z
      .string()
      .describe("Formatted search results for pattern analysis"),
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
    const { query, jurisdiction, conversationHistory } = inputData;

    console.log("[High-Advanced Search V2] Starting search");
    console.log("[High-Advanced Search V2] Query:", query);

    try {
      // Import query enhancer
      const { enhanceSearchQuery } = await import(
        "../agents/query-enhancer-agent"
      );

      // Enhance query with conversation context
      const enhanced = await enhanceSearchQuery(
        query,
        conversationHistory || []
      );

      console.log("[High-Advanced Search V2] Enhanced query:", enhanced);

      // Import Tavily advanced tool
      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );

      // Call Tavily with high-advanced configuration (20 results, no raw content)
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: enhanced.variations[0] || query,
          maxResults: 20, // High-advanced: 20 results for breadth
          jurisdiction: jurisdiction || "Zimbabwe",
          includeRawContent: false, // Summaries only for pattern analysis
        },
        runtimeContext,
      });

      console.log(
        "[High-Advanced Search V2] Tavily results:",
        searchResults.results.length
      );

      // Format raw results for Chat Agent (optimized for pattern analysis)
      let response = "";

      if (searchResults.results.length > 0) {
        response = `SEARCH RESULTS FOR PATTERN ANALYSIS: "${query}"\n\n`;
        response += `Found ${searchResults.results.length} results across multiple sources:\n\n`;

        searchResults.results.forEach((result: any, i: number) => {
          response += `--- RESULT ${i + 1} ---\n`;
          response += `Title: ${result.title}\n`;
          response += `URL: ${result.url}\n`;
          response += `Relevance Score: ${result.score}\n`;
          response += `Content:\n${result.content}\n\n`;
        });

        response += `\nINSTRUCTIONS: Analyze these ${searchResults.results.length} search results to identify patterns, trends, and common themes. Look for:
- Recurring concepts across multiple sources
- Different perspectives on the same topic
- Evolution of ideas or legal interpretations
- Consensus or disagreement among sources

Provide a comprehensive analysis that synthesizes information from ALL sources. Cite sources using [Title](URL) format.`;
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

      console.log("[High-Advanced Search V2] Search completed");
      console.log(
        "[High-Advanced Search V2] Response length:",
        response.length
      );
      console.log("[High-Advanced Search V2] Sources:", sources.length);

      return {
        response,
        sources,
        totalTokens: searchResults.tokenEstimate,
        rawResults: searchResults,
      };
    } catch (error) {
      console.error("[High-Advanced Search V2] Error:", error);

      return {
        response:
          "I encountered an error while searching. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});

export const highAdvanceSearchWorkflowV2 = createWorkflow({
  id: "high-advance-search-workflow-v2",
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
    response: z
      .string()
      .describe("Formatted search results for pattern analysis"),
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
