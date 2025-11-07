/**
 * Enhanced Comprehensive Workflow V2 (Refactored)
 *
 * Purpose: Maximum research depth - only triggered when user enables "Deep Research"
 * Token Budget: 10K-15K tokens
 * Latency: 15-25s
 * Tavily Credits: 3-4
 *
 * Use Cases:
 * - User explicitly enables "Deep Research" mode in UI
 * - Queries requiring exhaustive research
 * - Maximum source coverage needed
 * - Complex multi-faceted legal questions
 *
 * Architecture (V2 Strategy):
 * 1. Initial comprehensive Tavily search (15 results with raw content)
 * 2. Gap analysis to identify missing information
 * 3. Follow-up Tavily searches if gaps found (up to 3 searches, 10 results each)
 * 4. Pass ALL raw Tavily results to Chat Agent for synthesis
 * 5. Chat Agent processes raw results with conversation history
 *
 * Key Differences from V1:
 * - No entity extraction/validation (removed filtering)
 * - Raw Tavily results passed directly to Chat Agent
 * - Chat Agent has full conversation history
 * - Simpler, more reliable architecture
 */

import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Step 1: Initial Comprehensive Search
 */
const initialSearchStep = createStep({
  id: "initialSearch",
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
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction, conversationHistory } = inputData;

    console.log("[Enhanced Comprehensive V2] Starting initial search");
    console.log("[Enhanced Comprehensive V2] Query:", query);

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

      console.log("[Enhanced Comprehensive V2] Enhanced query:", enhancedQuery);

      // Import Tavily advanced tool
      const { tavilySearchAdvancedTool } = await import(
        "../tools/tavily-search-advanced"
      );

      // Initial search with raw content
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: enhancedQuery,
          jurisdiction,
          maxResults: 15, // Enhanced: 15 results for initial search
          includeRawContent: true, // Full content for deep analysis
        },
        runtimeContext,
      });

      console.log(
        "[Enhanced Comprehensive V2] Initial results:",
        searchResults.results.length
      );

      // Format results
      let initialResults = `INITIAL COMPREHENSIVE SEARCH RESULTS FOR: "${query}"\n\n`;
      initialResults += `Found ${searchResults.results.length} results with full content:\n\n`;

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
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive V2] Initial search error:", error);

      return {
        query,
        jurisdiction,
        conversationHistory: conversationHistory || [],
        initialResults: "Initial search failed",
        initialSources: [],
      };
    }
  },
});

/**
 * Step 2: Gap Analysis
 */
const gapAnalysisStep = createStep({
  id: "gapAnalysis",
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
  }),
  execute: async ({ inputData }) => {
    const {
      query,
      jurisdiction,
      conversationHistory,
      initialResults,
      initialSources,
    } = inputData;

    console.log("[Enhanced Comprehensive V2] Analyzing gaps");

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
  "gapQueries": ["query 1", "query 2", "query 3"] // max 3 queries
}

Be conservative - only suggest additional searches if truly necessary.`,
        model: () => cerebrasProvider("llama-3.3-70b"),
        tools: {},
      });

      const analysisPrompt = `Original Query: ${query}

Search Results Summary:
${initialResults.substring(0, 3000)}...

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
        gapQueries = (analysis.gapQueries || []).slice(0, 3); // Max 3 follow-up searches
      } catch {
        hasGaps = false;
        gapQueries = [];
      }

      console.log("[Enhanced Comprehensive V2] Gap analysis:", {
        hasGaps,
        gapQueries,
      });

      return {
        query,
        jurisdiction,
        conversationHistory,
        initialResults,
        initialSources,
        hasGaps,
        gapQueries,
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive V2] Gap analysis error:", error);

      return {
        query,
        jurisdiction,
        conversationHistory,
        initialResults,
        initialSources,
        hasGaps: false,
        gapQueries: [],
      };
    }
  },
});

/**
 * Step 3: Follow-up Searches
 */
const followUpSearchesStep = createStep({
  id: "followUpSearches",
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
    combinedResults: z.string().describe("Combined search results"),
    allSources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const {
      query,
      jurisdiction,
      conversationHistory,
      initialResults,
      initialSources,
      hasGaps,
      gapQueries,
    } = inputData;

    console.log("[Enhanced Comprehensive V2] Follow-up searches");

    let combinedResults = initialResults;
    const allSources = [...initialSources];

    // Perform follow-up searches if gaps identified
    if (hasGaps && gapQueries.length > 0) {
      console.log(
        "[Enhanced Comprehensive V2] Performing",
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
              jurisdiction,
              maxResults: 10, // Follow-up searches: 10 results each
              includeRawContent: false, // Summaries only
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
        } catch (error) {
          console.error(
            "[Enhanced Comprehensive V2] Follow-up search error:",
            error
          );
        }
      }
    }

    console.log(
      "[Enhanced Comprehensive V2] Total sources:",
      allSources.length
    );

    return {
      query,
      jurisdiction,
      conversationHistory,
      combinedResults,
      allSources,
    };
  },
});

/**
 * Step 4: Chat Agent Synthesis
 */
const chatAgentStep = createStep({
  id: "chatAgent",
  description: "Pass all raw results to Chat Agent for synthesis",
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string(),
    conversationHistory: z.array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    ),
    combinedResults: z.string(),
    allSources: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
      })
    ),
  }),
  outputSchema: z.object({
    response: z.string().describe("Final synthesized response"),
  }),
  execute: async ({ inputData }) => {
    const { query, conversationHistory, combinedResults, allSources } =
      inputData;

    console.log("[Enhanced Comprehensive V2] Chat Agent synthesis");
    console.log(
      "[Enhanced Comprehensive V2] Processing",
      allSources.length,
      "sources"
    );

    try {
      // Import Chat Agent
      const { Agent } = await import("@mastra/core/agent");
      const { getBalancedCerebrasProvider } = await import(
        "@/lib/ai/cerebras-key-balancer"
      );

      const cerebrasProvider = getBalancedCerebrasProvider();

      const chatAgent = new Agent({
        name: "Chat Agent",
        instructions: `You are DeepCounsel, an expert legal research assistant specializing in Zimbabwean law.

You have been provided with comprehensive search results from multiple Tavily searches.

Your task:
1. Analyze ALL search results provided
2. Synthesize information from multiple sources
3. Provide a comprehensive, detailed answer
4. Identify patterns and trends across sources
5. Compare different perspectives where relevant
6. Cite ALL relevant sources using [Title](URL) format
7. Be thorough and detailed - this is a deep research response

IMPORTANT:
- Use information from ALL provided search results
- Cite sources properly
- Provide comprehensive analysis
- This is deep research mode - be thorough`,
        model: () => cerebrasProvider("llama-3.3-70b"),
        tools: {},
      });

      // Build prompt with conversation history
      let prompt = "";

      if (conversationHistory.length > 0) {
        prompt += "CONVERSATION HISTORY:\n\n";
        for (const msg of conversationHistory) {
          prompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
        }
        prompt += "---\n\n";
      }

      prompt += `CURRENT QUERY: ${query}\n\n`;
      prompt += `SEARCH RESULTS:\n\n${combinedResults}\n\n`;
      prompt += `INSTRUCTIONS: Analyze ALL ${allSources.length} search results above and provide a comprehensive answer. Cite sources using [Title](URL) format.`;

      const result = await chatAgent.generate(prompt, {
        maxSteps: 1,
      });

      console.log(
        "[Enhanced Comprehensive V2] Chat Agent response length:",
        result.text.length
      );

      return {
        response: result.text,
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive V2] Chat Agent error:", error);

      return {
        response: `I encountered an error while synthesizing the research results. Here's what I found:

${combinedResults.substring(0, 2000)}...

Please try again or rephrase your query.`,
      };
    }
  },
});

export const enhancedComprehensiveWorkflowV2 = createWorkflow({
  id: "enhanced-comprehensive-workflow-v2",
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
    response: z.string().describe("Final synthesized response"),
  }),
})
  .then(initialSearchStep)
  .then(gapAnalysisStep)
  .then(followUpSearchesStep)
  .then(chatAgentStep)
  .commit();
