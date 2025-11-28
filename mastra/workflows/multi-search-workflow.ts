/**
 * Multi-Search Workflow
 *
 * Purpose: Handle broad queries by breaking them into 2-3 focused searches
 * Token Budget: 4K-8K tokens
 * Latency: 6-12s
 *
 * Use Cases:
 * - Broad queries covering multiple topics
 * - "What case law supports X protections?"
 * - "Tell me about Y rights in Zimbabwe"
 *
 * Strategy:
 * 1. Decompose broad query into 2-3 focused sub-queries
 * 2. Search each sub-query separately
 * 3. Combine results
 * 4. Synthesize comprehensive answer
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const decomposeStep = createStep({
  id: "decompose",
  description: "Decompose broad query into focused sub-queries",
  inputSchema: z.object({
    query: z.string().describe("The user's search query"),
    jurisdiction: z.string().default("Zimbabwe").describe("Legal jurisdiction"),
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
    subQueries: z
      .array(z.string())
      .describe("Array of focused sub-queries (1-3)"),
    isBroad: z.boolean().describe("Whether query was broad and decomposed"),
    jurisdiction: z.string().describe("Legal jurisdiction to pass through"),
    conversationHistory: z
      .array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      )
      .describe("Conversation history to pass through"),
  }),
  execute: async ({ inputData }) => {
    const { query, jurisdiction, conversationHistory } = inputData;

    console.log("[Multi-Search] Decomposing query:", query);

    try {
      const { decomposeQuery, isBroadQuery } = await import(
        "../agents/query-decomposer-agent"
      );

      const broad = isBroadQuery(query);

      if (!broad) {
        console.log("[Multi-Search] Query is focused, no decomposition needed");
        return {
          subQueries: [query],
          isBroad: false,
          jurisdiction,
          conversationHistory: conversationHistory || [],
        };
      }

      const subQueries = await decomposeQuery(query, conversationHistory || []);

      console.log(
        `[Multi-Search] Decomposed into ${subQueries.length} sub-queries`
      );

      return {
        subQueries,
        isBroad: true,
        jurisdiction,
        conversationHistory: conversationHistory || [],
      };
    } catch (error) {
      console.error("[Multi-Search] Decomposition error:", error);
      return {
        subQueries: [query],
        isBroad: false,
        jurisdiction,
        conversationHistory: conversationHistory || [],
      };
    }
  },
});

const multiSearchStep = createStep({
  id: "multi-search",
  description: "Execute multiple focused searches",
  inputSchema: z.object({
    subQueries: z.array(z.string()).describe("Array of sub-queries to search"),
    isBroad: z.boolean().describe("Whether query was decomposed"),
    jurisdiction: z.string().describe("Legal jurisdiction"),
    conversationHistory: z
      .array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      )
      .describe("Conversation history for context"),
  }),
  outputSchema: z.object({
    subQueries: z.array(z.string()).describe("Sub-queries that were searched"),
    allResults: z
      .array(
        z.object({
          subQuery: z.string(),
          enhancedQuery: z.string(),
          results: z.array(
            z.object({
              title: z.string(),
              url: z.string(),
              content: z.string(),
              score: z.number().optional(),
            })
          ),
        })
      )
      .describe("Results from all sub-queries"),
    totalResults: z.number().describe("Total number of results found"),
    isBroad: z.boolean().describe("Whether query was decomposed"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { subQueries, isBroad, jurisdiction, conversationHistory } =
      inputData;

    console.log(`[Multi-Search] Executing ${subQueries.length} searches`);

    try {
      const { enhanceSearchQuery } = await import(
        "../agents/query-enhancer-agent"
      );
      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );
      const { legalSearchTool } = await import("../tools/legal-search-tool");

      const allResults = [];
      let totalResults = 0;

      for (let i = 0; i < subQueries.length; i++) {
        const subQuery = subQueries[i];

        console.log(
          `[Multi-Search] Search ${i + 1}/${subQueries.length}: ${subQuery}`
        );

        // Enhance the sub-query with variations and HyDE
        const enhanced = await enhanceSearchQuery(
            subQuery,
            conversationHistory || []
        );

        console.log(`[Multi-Search] Sub-query ${i+1} enhanced variations:`, enhanced.variations.length);

        // Prepare parallel search promises
        // 1. Tavily search (use first variation + Zimbabwe context)
        const tavilyQuery = enhanced.variations[0];
        const tavilyPromise = tavilySearchAdvancedTool.execute({
            context: {
                query: tavilyQuery,
                maxResults: 5, // Fewer results per sub-query
                includeRawContent: true,
                jurisdiction: jurisdiction || "Zimbabwe"
            },
            runtimeContext
        });

        // 2. Legal searches (Variations + HyDE)
        // For multi-search, we use variations + HyDE but with lower topK
        const legalQueries = [
            enhanced.hydePassage,
            ...enhanced.variations
        ];

        const legalPromise = legalSearchTool.execute({
            context: {
                queries: legalQueries, // Use batch input
                topK: 5 // 5 results per variation
            },
            runtimeContext
        }).catch(err => {
            console.error(`[Multi-Search] Legal search failed for sub-query ${i+1}:`, err);
            return { results: [], batchResults: [] };
        });

        // Execute all searches for this sub-query
        const [tavilyResults, legalResultsOutput] = await Promise.all([
            tavilyPromise,
            legalPromise
        ]);

        // Merge legal results
        const allLegalResults = legalResultsOutput.results || [];
        
        // Deduplicate legal results by docId
        const uniqueLegalResults = Array.from(
            new Map(allLegalResults.map(item => [item.docId, item])).values()
        );

        // Sort by score
        uniqueLegalResults.sort((a, b) => b.score - a.score);
        
        // Take top 10 unique legal results
        const finalLegalResults = uniqueLegalResults.slice(0, 10);

        const mergedResults = [
            ...finalLegalResults.map((r: any) => ({
                title: `${r.source} - ${r.sourceFile}`,
                url: `legal-db://${r.docId}`,
                content: r.text,
                score: r.score
            })),
            ...(tavilyResults.results || [])
        ];

        totalResults += mergedResults.length;

        allResults.push({
          subQuery,
          enhancedQuery: enhanced.variations[0], // Use primary variation for display
          results: mergedResults,
        });

        console.log(
          `[Multi-Search] Search ${i + 1} found ${mergedResults.length} results (Legal: ${finalLegalResults.length}, Web: ${tavilyResults.results?.length || 0})`
        );
      }

      console.log(
        `[Multi-Search] All searches complete. Total results: ${totalResults}`
      );

      return {
        subQueries,
        allResults,
        totalResults,
        isBroad,
      };
    } catch (error) {
      console.error("[Multi-Search] Search error:", error);
      return {
        subQueries,
        allResults: [],
        totalResults: 0,
        isBroad,
      };
    }
  },
});

const synthesizeStep = createStep({
  id: "synthesize",
  description: "Synthesize results from multiple searches",
  inputSchema: z.object({
    subQueries: z.array(z.string()).describe("Sub-queries that were searched"),
    allResults: z
      .array(
        z.object({
          subQuery: z.string(),
          enhancedQuery: z.string(),
          results: z.array(
            z.object({
              title: z.string(),
              url: z.string(),
              content: z.string(),
              score: z.number().optional(),
            })
          ),
        })
      )
      .describe("Results from all sub-queries"),
    totalResults: z.number().describe("Total number of results found"),
    isBroad: z.boolean().describe("Whether query was decomposed"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Synthesized comprehensive response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("All unique sources cited"),
    totalTokens: z.number().describe("Estimated tokens used"),
    searchCount: z.number().describe("Number of searches performed"),
  }),
  execute: async ({ inputData }) => {
    const { subQueries, allResults, isBroad } = inputData;

    console.log("[Multi-Search] Synthesizing results");

    try {
      // Use first sub-query as the main query for display
      const mainQuery = subQueries[0] || "your query";

      // Format results for Chat Agent
      let response = `MULTI-SEARCH RESULTS FOR: "${mainQuery}"\n\n`;

      if (isBroad) {
        response += `This query was decomposed into ${allResults.length} focused searches:\n\n`;
      }

      allResults.forEach((searchResult, i) => {
        response += `--- SEARCH ${i + 1}: "${searchResult.subQuery}" ---\n`;
        response += `Enhanced query: "${searchResult.enhancedQuery}"\n`;
        response += `Results found: ${searchResult.results.length}\n\n`;

        searchResult.results.forEach((result, j) => {
          response += `Result ${i + 1}.${j + 1}:\n`;
          response += `Title: ${result.title}\n`;
          response += `URL: ${result.url}\n`;
          response += `Content: ${result.content}\n\n`;
        });

        response += "\n";
      });

      response += `\nINSTRUCTIONS: Analyze these search results and provide a comprehensive answer to the user's question. Organize your response by topic if the query was broad. Cite sources using [Title](URL) format. ONLY cite information that appears in the results above.`;

      // Extract all unique sources
      const sourcesMap = new Map<string, { title: string; url: string }>();

      allResults.forEach((searchResult) => {
        searchResult.results.forEach((result) => {
          if (!sourcesMap.has(result.url)) {
            sourcesMap.set(result.url, {
              title: result.title,
              url: result.url,
            });
          }
        });
      });

      const sources = Array.from(sourcesMap.values());

      // Estimate tokens
      const { estimateTokens } = await import("@/lib/utils/token-estimation");
      const totalTokens = estimateTokens(response);

      console.log("[Multi-Search] Synthesis complete");
      console.log(`[Multi-Search] Total sources: ${sources.length}`);
      console.log(`[Multi-Search] Total tokens: ${totalTokens}`);

      return {
        response,
        sources,
        totalTokens,
        searchCount: allResults.length,
      };
    } catch (error) {
      console.error("[Multi-Search] Synthesis error:", error);

      return {
        response:
          "I encountered an error while synthesizing the search results. Please try rephrasing your query.",
        sources: [],
        totalTokens: 0,
        searchCount: 0,
      };
    }
  },
});

export const multiSearchWorkflow = createWorkflow({
  id: "multi-search-workflow",
  inputSchema: z.object({
    query: z.string().describe("The user's search query"),
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
    response: z.string().describe("Synthesized comprehensive response"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("All unique sources cited"),
    totalTokens: z.number().describe("Estimated tokens used"),
    searchCount: z.number().describe("Number of searches performed"),
  }),
})
  .then(decomposeStep)
  .then(multiSearchStep)
  .then(synthesizeStep)
  .commit();
