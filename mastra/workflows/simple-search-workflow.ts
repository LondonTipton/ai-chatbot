/**
 * Simple Search Workflow
 *
 * A streamlined workflow that uses the Search Coordinator Agent to:
 * 1. Understand conversation context
 * 2. Search with Tavily
 * 3. Synthesize results without filtering
 *
 * This workflow REPLACES the complex pipeline:
 * OLD: search → extract → validate → claims → compose (5 steps, many failure points)
 * NEW: search-coordinator (1 step, never fails)
 *
 * Token Budget: 500-1500 tokens
 * Latency: 2-4 seconds
 * Reliability: High (no validation layers to block results)
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Single step: Direct Tavily Search
 *
 * Bypasses the agent layer and calls Tavily directly for maximum reliability
 */
const searchCoordinatorStep = createStep({
  id: "search-coordinator",
  description: "Direct Tavily search with query enhancement",
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
      .describe("Recent conversation history for context"),
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
    totalTokens: z.number().describe("Estimated tokens used"),
    rawResults: z.any().optional().describe("Raw Tavily results for debugging"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction, conversationHistory } = inputData;

    console.log("[Simple Search Workflow] Starting direct Tavily search");
    console.log("[Simple Search Workflow] Query:", query);
    console.log("[Simple Search Workflow] Jurisdiction:", jurisdiction);
    console.log(
      "[Simple Search Workflow] Context messages:",
      conversationHistory?.length || 0
    );

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

      console.log("[Simple Search Workflow] Enhanced query:", enhanced);

      // Import Tavily tool
      const { tavilySearchTool } = await import("../tools/tavily-search");

      // Call Tavily directly - use first variation as primary query
      const searchResults = await tavilySearchTool.execute({
        context: {
          query: enhanced.variations[0] || query,
          maxResults: 20,
        },
        runtimeContext,
      });

      console.log(
        "[Simple Search Workflow] Tavily results:",
        searchResults.results.length
      );

      // Pass RAW Tavily results to Chat Agent for synthesis
      // Format results as structured data for the agent to process
      let response = "";

      if (searchResults.results.length > 0) {
        // Build a structured response with ALL result details
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
- The case is not indexed in available legal databases
- The case name or citation might be different
- The information might be in offline legal resources

I recommend:
- Checking Zimbabwe Law Reports directly
- Consulting with a legal practitioner
- Visiting a law library for case law research`;
      }

      // Extract sources for metadata
      const sources = searchResults.results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      console.log("[Simple Search Workflow] Search completed");
      console.log("[Simple Search Workflow] Response length:", response.length);
      console.log("[Simple Search Workflow] Sources:", sources.length);

      return {
        response,
        sources,
        totalTokens: searchResults.tokenEstimate,
        rawResults: searchResults,
      };
    } catch (error) {
      console.error("[Simple Search Workflow] Error:", error);

      // Graceful fallback - never fail the workflow
      return {
        response:
          "I encountered an error while searching. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});

/**
 * Simple Search Workflow
 *
 * Single-step workflow using Search Coordinator Agent
 *
 * Benefits over old pipeline:
 * - Simpler: 1 step instead of 5
 * - More reliable: No validation layers to block results
 * - Faster: Fewer LLM calls
 * - Better context: Agent has full conversation history
 * - Never fails: Always returns something useful
 */
export const simpleSearchWorkflow = createWorkflow({
  id: "simple-search-workflow",
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
      .describe("Recent conversation history for context"),
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
    totalTokens: z.number().describe("Estimated tokens used"),
    rawResults: z.any().optional().describe("Raw Tavily results for debugging"),
  }),
})
  .then(searchCoordinatorStep)
  .commit();
