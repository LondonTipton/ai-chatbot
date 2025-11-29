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
    summarized: z.boolean().describe("Whether content was summarized"),
    rawResults: z.any().optional().describe("Raw Tavily results for debugging"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction, conversationHistory } = inputData;

    console.log("[Advanced Search V2] Starting search");
    console.log("[Advanced Search V2] Query:", query);

    try {
      // Import query enhancer
      const { enhanceSearchQuery } = await import(
        "../agents/query-enhancer-agent"
      );

      // Enhance query with variations and HyDE
      const enhanced = await enhanceSearchQuery(
        query,
        conversationHistory || []
      );

      console.log(
        "[Advanced Search V2] Enhanced variations:",
        enhanced.variations.length
      );
      console.log(
        "[Advanced Search V2] HyDE passage length:",
        enhanced.hydePassage.length
      );

      // Import Tavily tool
      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );
      const { legalSearchTool } = await import("../tools/legal-search-tool");

      // Prepare parallel search promises
      // 1. Tavily search (use first variation + Zimbabwe context)
      const tavilyQuery = enhanced.variations[0];
      const tavilyPromise = tavilySearchAdvancedTool.execute({
        context: {
          query: tavilyQuery,
          maxResults: 10,
          includeRawContent: true,
          jurisdiction: jurisdiction || "Zimbabwe",
        },
        runtimeContext,
      });

      // 2. Legal searches (Variations + HyDE)
      // For advanced search, we use all 3 variations + HyDE
      const legalQueries = [enhanced.hydePassage, ...enhanced.variations];

      const legalPromise = legalSearchTool
        .execute({
          context: {
            queries: legalQueries, // Use batch input
            topK: 20, // 20 results per variation
          },
          runtimeContext,
        })
        .catch((err) => {
          console.error("[Advanced Search V2] Legal search failed:", err);
          return { results: [], batchResults: [] };
        });

      // Execute all searches
      const [tavilyResults, legalResultsOutput] = await Promise.all([
        tavilyPromise,
        legalPromise,
      ]);

      // Merge legal results
      const allLegalResults = legalResultsOutput.results || [];

      // Deduplicate legal results by docId
      const uniqueLegalResults = Array.from(
        new Map(allLegalResults.map((item) => [item.docId, item])).values()
      );

      // Sort by score
      uniqueLegalResults.sort((a, b) => b.score - a.score);

      // Take top 20 unique legal results
      const finalLegalResults = uniqueLegalResults.slice(0, 20);

      console.log(
        "[Advanced Search V2] Results - Tavily:",
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
        response += `WEB SEARCH RESULTS (${tavilyResults.results.length}):\n\n`;
      }

      // Add Tavily Results
      tavilyResults.results.forEach((result: any) => {
        response += `--- WEB RESULT ${result.position} ---\n`;
        response += `Title: ${result.title}\n`;
        response += `URL: ${result.url}\n`;
        response += `Content:\n${result.content}\n\n`;
        if (result.rawContent) {
          response += `Full Content Preview:\n${result.rawContent.substring(
            0,
            500
          )}...\n\n`;
        }
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
          // Include full result for downstream processing
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

      // Check if summarization is needed (>50K tokens)
      const { estimateTokens, shouldSummarize } = await import(
        "@/lib/utils/token-estimation"
      );

      const totalTokens = estimateTokens(response);
      let summarized = false;

      if (shouldSummarize(totalTokens, 50_000)) {
        console.log(
          "[Advanced Search V2] Content exceeds 50K tokens, triggering summarization"
        );
        console.log("[Advanced Search V2] Original tokens:", totalTokens);

        const { summarizeLegalContent } = await import(
          "../agents/content-summarizer-agent"
        );

        const summarizationResult = await summarizeLegalContent(response, {
          query,
          jurisdiction: jurisdiction || "Zimbabwe",
          sourceCount: sources.length,
        });

        response = summarizationResult.summarizedContent;
        summarized = true;

        console.log("[Advanced Search V2] Summarization complete", {
          originalTokens: summarizationResult.originalTokens,
          summarizedTokens: summarizationResult.summarizedTokens,
          compressionRatio: summarizationResult.compressionRatio.toFixed(2),
          tokensSaved:
            summarizationResult.originalTokens -
            summarizationResult.summarizedTokens,
        });
      } else {
        console.log(
          "[Advanced Search V2] Content within limits, no summarization needed"
        );
        console.log("[Advanced Search V2] Total tokens:", totalTokens);
      }

      console.log("[Advanced Search V2] Search completed");
      console.log("[Advanced Search V2] Response length:", response.length);
      console.log("[Advanced Search V2] Sources:", sources.length);
      console.log("[Advanced Search V2] Summarized:", summarized);

      return {
        response,
        sources,
        totalTokens,
        summarized,
        rawResults: tavilyResults,
      };
    } catch (error) {
      console.error("[Advanced Search V2] Error:", error);

      return {
        response:
          "I encountered an error while searching. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
        summarized: false,
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
    summarized: z.boolean().describe("Whether content was summarized"),
    rawResults: z.any().optional().describe("Raw Tavily results for debugging"),
  }),
})
  .then(searchStep)
  .commit();
