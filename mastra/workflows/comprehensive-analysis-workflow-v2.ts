/**
 * Comprehensive Analysis Workflow V2 (Refactored)
 *
 * Purpose: Multi-angle research with iterative searches
 * Token Budget: 5K-10K tokens
 * Latency: 8-15s
 * Tavily Credits: 2-3
 *
 * Use Cases:
 * - Complex legal questions requiring multiple perspectives
 * - Research with potential information gaps
 * - Comprehensive analysis of multifaceted topics
 *
 * Tavily Configuration:
 * - Initial search: 10 results with raw content
 * - Follow-up searches: 5 results each (if gaps identified)
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Step 1: Initial Comprehensive Search
 */
const initialSearchStep = createStep({
  id: "initial-search",
  description: "Perform initial comprehensive search with raw content",
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
    query: z.string(),
    jurisdiction: z.string(),
    conversationHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    ),
    initialResults: z.string().describe("Formatted initial search results"),
    initialSources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    tokenEstimate: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction, conversationHistory } = inputData;

    console.log("[Comprehensive V2] Starting initial search");
    console.log("[Comprehensive V2] Query:", query);

    try {
      // Import query enhancer
      const { enhanceSearchQuery } = await import(
        "../agents/query-enhancer-agent"
      );

      // Enhance query
      const enhancedQuery = await enhanceSearchQuery(
        query,
        conversationHistory || []
      );

      console.log("[Comprehensive V2] Enhanced query:", enhancedQuery);

      // Import Tavily advanced tool
      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );

      // Initial search with raw content
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: enhancedQuery,
          maxResults: 10,
          includeRawContent: true, // Full content for initial analysis
        },
        runtimeContext,
      });

      console.log(
        "[Comprehensive V2] Initial results:",
        searchResults.results.length
      );

      // Format results
      let initialResults = `INITIAL SEARCH RESULTS FOR: "${query}"\n\n`;
      initialResults += `Found ${searchResults.results.length} results:\n\n`;

      searchResults.results.forEach((result: any, i: number) => {
        initialResults += `--- RESULT ${i + 1} ---\n`;
        initialResults += `Title: ${result.title}\n`;
        initialResults += `URL: ${result.url}\n`;
        initialResults += `Relevance Score: ${result.score}\n`;
        initialResults += `Summary:\n${result.content}\n\n`;

        if (result.rawContent) {
          initialResults += `Full Content:\n${result.rawContent}\n\n`;
        }
      });

      const initialSources = searchResults.results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      return {
        query,
        jurisdiction,
        conversationHistory: conversationHistory || [],
        initialResults,
        initialSources,
        tokenEstimate: searchResults.tokenEstimate,
      };
    } catch (error) {
      console.error("[Comprehensive V2] Initial search error:", error);

      return {
        query,
        jurisdiction,
        conversationHistory: conversationHistory || [],
        initialResults: "Initial search failed",
        initialSources: [],
        tokenEstimate: 0,
      };
    }
  },
});

/**
 * Step 2: Gap Analysis (Agentic)
 */
const gapAnalysisStep = createStep({
  id: "gap-analysis",
  description: "Analyze initial results for information gaps",
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string(),
    conversationHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    ),
    initialResults: z.string(),
    initialSources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    tokenEstimate: z.number(),
  }),
  outputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string(),
    conversationHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    ),
    initialResults: z.string(),
    initialSources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    hasGaps: z.boolean(),
    gapQueries: z.array(z.string()),
    tokenEstimate: z.number(),
  }),
  execute: async ({ inputData }) => {
    const {
      query,
      jurisdiction,
      conversationHistory,
      initialResults,
      initialSources,
      tokenEstimate,
    } = inputData;

    console.log("[Comprehensive V2] Analyzing gaps");

    try {
      // Import gap analyzer agent
      const { Agent } = await import("@mastra/core/agent");
      const { getBalancedCerebrasProvider } = await import(
        "@/lib/ai/cerebras-key-balancer"
      );

      const cerebrasProvider = getBalancedCerebrasProvider();

      const gapAnalyzerAgent = new Agent({
        name: "Gap Analyzer",
        instructions: `You are a legal research gap analyzer.

Analyze the search results and identify if there are significant information gaps that require additional searches.

ONLY identify gaps if:
- Critical legal aspects are completely missing
- Important perspectives are absent
- Key statutes or cases are not covered

Output format:
{
  "hasGaps": true/false,
  "gapQueries": ["query 1", "query 2"] // max 2 queries
}

Be conservative - only suggest additional searches if truly necessary.`,
        model: () => cerebrasProvider("llama-3.3-70b"),
        tools: {},
      });

      const analysisPrompt = `Original Query: ${query}

Search Results Summary:
${initialResults.substring(0, 2000)}...

Analyze if there are critical information gaps requiring additional searches.`;

      const result = await gapAnalyzerAgent.generate(analysisPrompt, {
        maxSteps: 1,
      });

      // Parse gap analysis
      let hasGaps = false;
      let gapQueries: string[] = [];

      try {
        const analysis = JSON.parse(result.text);
        hasGaps = analysis.hasGaps || false;
        gapQueries = (analysis.gapQueries || []).slice(0, 2); // Max 2 follow-up searches
      } catch {
        // If parsing fails, assume no gaps
        hasGaps = false;
        gapQueries = [];
      }

      console.log("[Comprehensive V2] Gap analysis:", { hasGaps, gapQueries });

      return {
        query,
        jurisdiction,
        conversationHistory,
        initialResults,
        initialSources,
        hasGaps,
        gapQueries,
        tokenEstimate,
      };
    } catch (error) {
      console.error("[Comprehensive V2] Gap analysis error:", error);

      // On error, proceed without additional searches
      return {
        query,
        jurisdiction,
        conversationHistory,
        initialResults,
        initialSources,
        hasGaps: false,
        gapQueries: [],
        tokenEstimate,
      };
    }
  },
});

/**
 * Step 3: Follow-up Searches (Conditional)
 */
const followUpSearchesStep = createStep({
  id: "follow-up-searches",
  description: "Perform follow-up searches if gaps identified",
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string(),
    conversationHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    ),
    initialResults: z.string(),
    initialSources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    hasGaps: z.boolean(),
    gapQueries: z.array(z.string()),
    tokenEstimate: z.number(),
  }),
  outputSchema: z.object({
    response: z.string().describe("Combined search results"),
    sources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    totalTokens: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const {
      query,
      initialResults,
      initialSources,
      hasGaps,
      gapQueries,
      tokenEstimate,
    } = inputData;

    console.log("[Comprehensive V2] Follow-up searches");

    let combinedResults = initialResults;
    const allSources = [...initialSources];
    let totalTokens = tokenEstimate;

    // Perform follow-up searches if gaps identified
    if (hasGaps && gapQueries.length > 0) {
      console.log(
        "[Comprehensive V2] Performing",
        gapQueries.length,
        "follow-up searches"
      );

      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );

      for (const gapQuery of gapQueries) {
        try {
          const gapResults = await tavilySearchAdvancedTool.execute({
            context: {
              query: gapQuery,
              maxResults: 5, // Smaller follow-up searches
              includeRawContent: false,
            },
            runtimeContext,
          });

          combinedResults += `\n\n--- FOLLOW-UP SEARCH: "${gapQuery}" ---\n\n`;
          combinedResults += `Found ${gapResults.results.length} additional results:\n\n`;

          gapResults.results.forEach((result: any, i: number) => {
            combinedResults += `--- RESULT ${i + 1} ---\n`;
            combinedResults += `Title: ${result.title}\n`;
            combinedResults += `URL: ${result.url}\n`;
            combinedResults += `Relevance Score: ${result.score}\n`;
            combinedResults += `Content:\n${result.content}\n\n`;

            allSources.push({
              title: result.title,
              url: result.url,
            });
          });

          totalTokens += gapResults.tokenEstimate;
        } catch (error) {
          console.error("[Comprehensive V2] Follow-up search error:", error);
        }
      }
    }

    // Add final instructions
    combinedResults += `\n\nINSTRUCTIONS: Analyze ALL search results above (initial + follow-up) and provide a comprehensive answer to: "${query}"

Use ALL relevant information from the results. Cite sources using [Title](URL) format. This is a comprehensive analysis, so be thorough and detailed.`;

    console.log("[Comprehensive V2] Total sources:", allSources.length);
    console.log("[Comprehensive V2] Total tokens:", totalTokens);

    return {
      response: combinedResults,
      sources: allSources,
      totalTokens,
    };
  },
});

export const comprehensiveAnalysisWorkflowV2 = createWorkflow({
  id: "comprehensive-analysis-workflow-v2",
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
    response: z.string().describe("Combined search results"),
    sources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
    totalTokens: z.number(),
  }),
})
  .then(initialSearchStep)
  .then(gapAnalysisStep)
  .then(followUpSearchesStep)
  .commit();
