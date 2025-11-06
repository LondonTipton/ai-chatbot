import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  generateGapFillingQueries,
  identifyResearchGaps,
  summarizeGaps,
} from "@/lib/utils/research-helpers";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilyContextSearchTool } from "../tools/tavily-context-search";

/**
 * Comprehensive Analysis Workflow
 *
 * Token Budget: 25K-30K tokens (UPDATED from 18K-20K)
 * Steps: initial-research → analyze-gaps → enhance-or-deep-dive → document
 * Latency: 25-47s
 *
 * This workflow provides comprehensive legal research by:
 * 1. Performing initial research with context search (8K tokens, INCREASED from 5K)
 * 2. Analyzing gaps in the research results
 * 3. Conditionally branching:
 *    - If gaps.length > 2: deep-dive with 2 parallel searches (14K tokens, INCREASED from 10K @ 7K each)
 *    - Else: enhance with single additional search (6K tokens, INCREASED from 5K)
 * 4. Synthesizing all results into comprehensive document (8K-10K tokens, INCREASED from 3K-5K)
 *
 * Requirements: 6.3
 * UPDATED: November 6, 2025 - Increased to prevent truncation and improve synthesis quality
 */

/**
 * Step 1: Initial Research
 * Performs comprehensive context search with 8K token budget (INCREASED from 5K)
 * Token estimate: 8K tokens
 */
const initialResearchStep = createStep({
  id: "initial-research",
  description: "Perform initial comprehensive research with context search",
  inputSchema: z.object({
    query: z.string().describe("The research query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    context: z.string().describe("Research context from initial search"),
    tokenCount: z.number().describe("Tokens used in initial research"),
    truncated: z.boolean().describe("Whether content was truncated"),
    query: z.string().describe("The enhanced query used"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      console.log("[Comprehensive Analysis] Starting initial research", {
        query: `${query.substring(0, 50)}...`,
        jurisdiction,
      });

      // Execute context search with 8K token budget (INCREASED from 5K)
      const searchResults = await tavilyContextSearchTool.execute({
        context: {
          query,
          maxTokens: 8000,
          jurisdiction,
          timeRange: "year",
        },
        runtimeContext,
      });

      console.log("[Comprehensive Analysis] Initial research complete", {
        tokenCount: searchResults.tokenCount,
        truncated: searchResults.truncated,
      });

      return {
        context: searchResults.context,
        tokenCount: searchResults.tokenCount,
        truncated: searchResults.truncated,
        query: searchResults.query,
      };
    } catch (error) {
      console.error("[Comprehensive Analysis] Initial research error:", error);

      // Return minimal context to allow workflow to continue
      return {
        context: "Initial research failed. Proceeding with limited context.",
        tokenCount: 0,
        truncated: false,
        query,
      };
    }
  },
});

/**
 * Step 2: Analyze Gaps
 * Analyzes research results to identify gaps and determine next steps
 * Token estimate: minimal (local processing)
 */
const analyzeGapsStep = createStep({
  id: "analyze-gaps",
  description: "Analyze research results to identify gaps",
  inputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
  }),
  outputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
    summarized: z.boolean(),
    gaps: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        priority: z.string(),
        suggestedQuery: z.string().optional(),
      })
    ),
    gapSummary: z.string(),
    shouldDeepDive: z.boolean(),
    gapQueries: z.array(z.string()),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { context, tokenCount, truncated, query } = inputData;
    const initData = await Promise.resolve(getInitData());
    const { jurisdiction } = initData;

    try {
      console.log("[Comprehensive Analysis] Analyzing research gaps", {
        context: context.substring(0, 50),
      });

      // Parse context to extract results for gap analysis
      // The context is formatted with sections, so we'll treat it as a single result
      const mockResults = [
        {
          title: "Initial Research Results",
          content: context,
          url: "",
        },
      ];

      // Identify research gaps
      const gaps = identifyResearchGaps({
        query,
        results: mockResults,
        jurisdiction,
      });

      // Generate summary
      const gapSummary = summarizeGaps(gaps);

      // Determine if deep dive is needed (more than 2 gaps)
      const shouldDeepDive = gaps.length > 2;

      // Generate gap-filling queries
      const gapQueries = generateGapFillingQueries(gaps);

      console.log("[Comprehensive Analysis] Gap analysis complete", {
        gapsFound: gaps.length,
        shouldDeepDive,
        gapQueriesCount: gapQueries.length,
        gapSummary,
      });

      return {
        context,
        tokenCount,
        truncated,
        query,
        summarized: false,
        gaps,
        gapSummary,
        shouldDeepDive,
        gapQueries,
      };
    } catch (error) {
      console.error("[Comprehensive Analysis] Gap analysis error:", error);

      // Return no gaps to continue with enhance path
      return {
        context,
        tokenCount,
        truncated,
        query,
        summarized: false,
        gaps: [],
        gapSummary: "Gap analysis failed",
        shouldDeepDive: false,
        gapQueries: [],
      };
    }
  },
});

/**
 * Step 4: Enhance or Deep Dive (conditional based on gaps)
 * Performs either single additional search (enhance) or 2 parallel searches (deep-dive)
 * Token estimate: 6K tokens (enhance, INCREASED from 5K) or 14K tokens (deep-dive, INCREASED from 10K @ 7K each)
 */
const enhanceOrDeepDiveStep = createStep({
  id: "enhance-or-deep-dive",
  description:
    "Conditionally enhance with single search or deep dive with parallel searches",
  inputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
    summarized: z.boolean(),
    gaps: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        priority: z.string(),
        suggestedQuery: z.string().optional(),
      })
    ),
    gapSummary: z.string(),
    shouldDeepDive: z.boolean(),
    gapQueries: z.array(z.string()),
  }),
  outputSchema: z.object({
    initialContext: z.string(),
    enhancedContext: z.string().optional(),
    deepDiveContext1: z.string().optional(),
    deepDiveContext2: z.string().optional(),
    totalTokens: z.number(),
    path: z.enum(["enhance", "deep-dive"]),
  }),
  execute: async ({ inputData, getInitData, runtimeContext }) => {
    const { context, tokenCount, shouldDeepDive, gapQueries } = inputData;
    const initData = getInitData();
    const { jurisdiction } = initData;

    // Conditional branching: if gaps.length > 2, go to deep-dive; else go to enhance
    if (shouldDeepDive) {
      // Deep Dive Path
      try {
        console.log(
          "[Comprehensive Analysis] Taking deep-dive path (gaps > 2)"
        );

        // Use first 2 gap queries, or generate fallback queries
        const query1 = gapQueries[0] || `${inputData.query} detailed analysis`;
        const query2 =
          gapQueries[1] || `${inputData.query} case law precedents`;

        // Execute 2 parallel searches
        const [results1, results2] = await Promise.all([
          tavilyContextSearchTool.execute({
            context: {
              query: query1,
              maxTokens: 7000,
              jurisdiction,
              timeRange: "year",
            },
            runtimeContext,
          }),
          tavilyContextSearchTool.execute({
            context: {
              query: query2,
              maxTokens: 7000,
              jurisdiction,
              timeRange: "year",
            },
            runtimeContext,
          }),
        ]);

        const totalTokens =
          tokenCount + results1.tokenCount + results2.tokenCount;

        console.log("[Comprehensive Analysis] Deep dive complete", {
          deepDive1Tokens: results1.tokenCount,
          deepDive2Tokens: results2.tokenCount,
          totalTokens,
        });

        return {
          initialContext: context,
          enhancedContext: undefined,
          deepDiveContext1: results1.context,
          deepDiveContext2: results2.context,
          totalTokens,
          path: "deep-dive" as const,
        };
      } catch (error) {
        console.error("[Comprehensive Analysis] Deep dive error:", error);

        // Continue with initial context only
        return {
          initialContext: context,
          enhancedContext: undefined,
          deepDiveContext1: undefined,
          deepDiveContext2: undefined,
          totalTokens: tokenCount,
          path: "deep-dive" as const,
        };
      }
    } else {
      // Enhance Path
      try {
        console.log("[Comprehensive Analysis] Taking enhance path (gaps <= 2)");

        // Use first gap query if available, otherwise use original query
        const enhanceQuery = gapQueries[0] || inputData.query;

        // Perform single additional search
        const enhancedResults = await tavilyContextSearchTool.execute({
          context: {
            query: enhanceQuery,
            maxTokens: 6000,
            jurisdiction,
            timeRange: "year",
          },
          runtimeContext,
        });

        console.log("[Comprehensive Analysis] Enhancement complete", {
          enhancedTokens: enhancedResults.tokenCount,
          totalTokens: tokenCount + enhancedResults.tokenCount,
        });

        return {
          initialContext: context,
          enhancedContext: enhancedResults.context,
          deepDiveContext1: undefined,
          deepDiveContext2: undefined,
          totalTokens: tokenCount + enhancedResults.tokenCount,
          path: "enhance" as const,
        };
      } catch (error) {
        console.error("[Comprehensive Analysis] Enhancement error:", error);

        // Continue with initial context only
        return {
          initialContext: context,
          enhancedContext: undefined,
          deepDiveContext1: undefined,
          deepDiveContext2: undefined,
          totalTokens: tokenCount,
          path: "enhance" as const,
        };
      }
    }
  },
});

/**
 * Step 6: Document
 * Synthesizes all research into comprehensive document
 * Token estimate: 3K-5K tokens
 */
const documentStep = createStep({
  id: "document",
  description: "Synthesize all research into comprehensive document",
  inputSchema: z.object({
    initialContext: z.string(),
    enhancedContext: z.string().optional(),
    deepDiveContext1: z.string().optional(),
    deepDiveContext2: z.string().optional(),
    totalTokens: z.number(),
    path: z.enum(["enhance", "deep-dive"]),
  }),
  outputSchema: z.object({
    response: z.string().describe("Comprehensive synthesized document"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
    path: z.enum(["enhance", "deep-dive"]).describe("Path taken in workflow"),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      initialContext,
      enhancedContext,
      deepDiveContext1,
      deepDiveContext2,
      totalTokens,
      path,
    } = inputData;
    const initData = getInitData();
    const { query } = initData;

    try {
      console.log("[Comprehensive Analysis] Creating final document", {
        path,
        totalTokensSoFar: totalTokens,
      });

      // Build comprehensive synthesis prompt
      let synthesisPrompt = `Create a comprehensive legal research document for: "${query}"

## Initial Research
${initialContext}
`;

      // Add enhanced or deep dive content based on path
      if (path === "enhance" && enhancedContext) {
        synthesisPrompt += `
## Enhanced Research
${enhancedContext}
`;
      } else if (path === "deep-dive") {
        if (deepDiveContext1) {
          synthesisPrompt += `
## Deep Dive Research - Part 1
${deepDiveContext1}
`;
        }
        if (deepDiveContext2) {
          synthesisPrompt += `
## Deep Dive Research - Part 2
${deepDiveContext2}
`;
        }
      }

      synthesisPrompt += `

## Instructions
Create a publication-quality legal research document that:
1. Provides comprehensive analysis of the topic
2. Includes all relevant Zimbabwe legal context
3. Cites all sources with proper URLs
4. Organizes information logically with clear sections
5. Provides actionable conclusions and recommendations
6. Uses professional legal writing style
7. Includes executive summary at the beginning

The document should be self-contained and suitable for professional use.`;

      // Generate comprehensive synthesis
      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 1,
      });

      // Estimate synthesis tokens
      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const finalTotalTokens = totalTokens + synthesisTokens;

      console.log("[Comprehensive Analysis] Document creation complete", {
        synthesisTokens,
        finalTotalTokens,
        withinBudget: finalTotalTokens <= 20_000,
      });

      return {
        response: synthesized.text,
        totalTokens: finalTotalTokens,
        path,
      };
    } catch (error) {
      console.error("[Comprehensive Analysis] Document creation error:", error);

      // Fallback: return concatenated context
      const fallbackResponse = `# Comprehensive Research Results

## Initial Research
${initialContext}

${
  enhancedContext
    ? `## Enhanced Research\n${enhancedContext}`
    : deepDiveContext1
    ? `## Deep Dive Research\n${deepDiveContext1}\n\n${deepDiveContext2 || ""}`
    : ""
}

Note: Synthesis failed. Raw research results provided above.`;

      return {
        response: fallbackResponse,
        totalTokens,
        path,
      };
    }
  },
});

/**
 * Comprehensive Analysis Workflow
 *
 * Executes: initial-research → analyze-gaps → enhance-or-deep-dive → document
 * Token Budget: 18K-20K tokens
 * Latency Target: 25-47s
 *
 * Conditional branching:
 * - If gaps.length > 2: goes to deep-dive path
 * - Else: goes to enhance path
 */
export const comprehensiveAnalysisWorkflow = createWorkflow({
  id: "comprehensive-analysis-workflow",
  inputSchema: z.object({
    query: z.string().describe("The research query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Comprehensive synthesized document"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
    path: z.enum(["enhance", "deep-dive"]).describe("Path taken in workflow"),
  }),
})
  .then(initialResearchStep)
  .then(analyzeGapsStep)
  .then(enhanceOrDeepDiveStep)
  .then(documentStep)
  .commit();
