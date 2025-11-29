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

      const enhanceStartTime = performance.now();
      // Enhance query with variations and HyDE
      const enhanced = await enhanceSearchQuery(
        query,
        conversationHistory || []
      );
      const enhanceEndTime = performance.now();

      console.log(
        "[Basic Search V2] Generated variations:",
        enhanced.variations.length
      );
      console.log(
        "[Basic Search V2] HyDE passage length:",
        enhanced.hydePassage.length
      );
      console.log(
        `[Basic Search V2] ⏱️ Query enhancement time: ${(
          enhanceEndTime - enhanceStartTime
        ).toFixed(0)}ms`
      );

      // Import Tavily tool
      const { tavilySearchTool } = await import("../tools/tavily-search");
      const { legalSearchTool } = await import("../tools/legal-search-tool");

      // Prepare parallel search promises
      // 1. Tavily search (use first variation + Zimbabwe context)
      const tavilyQuery = enhanced.variations[0];

      console.log("[Basic Search V2] Starting parallel searches...");
      const searchStartTime = performance.now();

      const tavilyPromise = tavilySearchTool.execute({
        context: {
          query: tavilyQuery,
          maxResults: 10,
        },
        runtimeContext,
      });

      // 2. Legal searches (Variations + HyDE)
      // We'll search for the HyDE passage and the top 2 variations to save resources
      const legalQueries = [
        enhanced.hydePassage,
        ...enhanced.variations.slice(0, 2),
      ];

      console.log(
        `[Basic Search V2] Batch legal search: ${legalQueries.length} queries`
      );
      const legalSearchStart = performance.now();

      const legalPromise = legalSearchTool
        .execute({
          context: {
            queries: legalQueries, // Use batch input
            topK: 5, // 5 results per variation
          },
          runtimeContext,
        })
        .catch((err) => {
          console.error("[Basic Search V2] Legal search failed:", err);
          return { results: [], batchResults: [] };
        });

      // Execute all searches
      const [tavilyResults, legalResultsOutput] = await Promise.all([
        tavilyPromise,
        legalPromise,
      ]);

      const searchEndTime = performance.now();
      const legalSearchTime = searchEndTime - legalSearchStart;
      const totalSearchTime = searchEndTime - searchStartTime;

      console.log(
        `[Basic Search V2] ⏱️  Legal search time: ${legalSearchTime.toFixed(
          0
        )}ms`
      );
      console.log(
        `[Basic Search V2] ⏱️  Total parallel search time: ${totalSearchTime.toFixed(
          0
        )}ms`
      );

      // Merge legal results
      // The tool now returns 'results' which is already flattened, or 'batchResults'
      const allLegalResults = legalResultsOutput.results || [];

      // Deduplicate legal results by docId
      const uniqueLegalResults = Array.from(
        new Map(allLegalResults.map((item) => [item.docId, item])).values()
      );

      // Sort by score
      uniqueLegalResults.sort((a, b) => b.score - a.score);

      // Take top 10 unique legal results
      const finalLegalResults = uniqueLegalResults.slice(0, 10);

      console.log(
        "[Basic Search V2] Results - Tavily:",
        tavilyResults.results.length,
        "Legal (Unique):",
        finalLegalResults.length
      );

      // Format raw results for Chat Agent
      let response = "";

      // Add Legal Results first
      if (finalLegalResults.length > 0) {
        response += `INTERNAL LEGAL DATABASE RESULTS (${finalLegalResults.length}):\n\n`;
        finalLegalResults.forEach((result: any, i: number) => {
          response += `--- LEGAL RESULT ${i + 1} ---\n`;
          response += `Source: ${result.source} (${result.sourceFile})\n`;
          response += `Relevance Score: ${result.score}\n`;
          response += `Content:\n${result.text}\n\n`;
        });
        response += `WEB SEARCH RESULTS (${tavilyResults.results.length}):\n\n`;
      } else {
        response += `SEARCH RESULTS FOR: "${query}"\n\n`;
        response += `Found ${tavilyResults.results.length} results:\n\n`;
      }

      tavilyResults.results.forEach((result: any, i: number) => {
        response += `--- RESULT ${i + 1} ---\n`;
        response += `Title: ${result.title}\n`;
        response += `URL: ${result.url}\n`;
        response += `Relevance Score: ${result.score}\n`;
        response += `Content:\n${result.content}\n\n`;
      });

      if (
        tavilyResults.results.length === 0 &&
        finalLegalResults.length === 0
      ) {
        response = `No search results found for: "${query}"

This might be because:
- The information is not indexed in available databases
- The query terms might need adjustment
- The information might be in offline resources

I recommend:
- Rephrasing the query
- Checking specialized legal databases
- Consulting with a legal practitioner`;
      } else {
        response += `\nINSTRUCTIONS: Analyze these search results and provide a comprehensive answer to the user's question. Use ALL relevant information from the results above. Cite sources using [Title](URL) format.`;
      }

      // Extract sources for metadata (include full legal metadata for rich citations)
      const sources = [
        ...finalLegalResults.map((r: any) => ({
          title: r.metadata?.case_identifier
            ? `${r.metadata.case_identifier} (${r.source})`
            : `${r.source} - ${r.sourceFile}`,
          url: `legal-db://${r.docId || r.metadata?.doc_id || "unknown"}`,
          source: r.source,
          sourceFile: r.sourceFile,
          text: r.text,
          score: r.score,
          docId: r.docId,
          metadata: r.metadata,
        })),
        ...tavilyResults.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })),
      ];

      console.log("[Basic Search V2] Search completed");
      console.log("[Basic Search V2] Response length:", response.length);
      console.log("[Basic Search V2] Sources:", sources.length);

      return {
        response,
        sources,
        totalTokens: tavilyResults.tokenEstimate,
        rawResults: tavilyResults,
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
