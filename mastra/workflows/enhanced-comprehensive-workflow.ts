import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  generateGapFillingQueries,
  identifyResearchGaps,
  summarizeGaps,
} from "@/lib/utils/research-helpers";
import {
  createTokenBudgetTracker,
  type TokenBudgetReport,
} from "@/lib/utils/token-budget-tracker";
import { estimateTokens } from "@/lib/utils/token-estimation";
import { summarizerAgent } from "../agents/summarizer-agent";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilyContextSearchTool } from "../tools/tavily-context-search";

/**
 * Enhanced Comprehensive Analysis Workflow with Intelligent Summarization
 *
 * Token Budget: 18K-25K tokens (adaptive)
 * Steps: initial-research → conditional-summarization → analyze-gaps → enhance-or-deep-dive → final-summarization → document
 * Latency: 25-50s
 *
 * Key Improvements:
 * 1. Token budget tracking throughout workflow
 * 2. Conditional summarization when token pressure detected
 * 3. Intelligent compression before gap analysis
 * 4. Final summarization before synthesis to ensure quality
 * 5. Adaptive token allocation based on usage patterns
 *
 * This workflow prevents information loss from truncation while staying within budget.
 */

/**
 * Step 1: Initial Research with Token Tracking
 */
const initialResearchStep = createStep({
  id: "initial-research",
  description: "Perform initial comprehensive research with token tracking",
  inputSchema: z.object({
    query: z.string().describe("The research query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
    tokenBudget: z
      .number()
      .default(20_000)
      .describe("Total token budget for workflow"),
  }),
  outputSchema: z.object({
    context: z.string().describe("Research context from initial search"),
    tokenCount: z.number().describe("Tokens used in initial research"),
    truncated: z.boolean().describe("Whether content was truncated"),
    query: z.string().describe("The enhanced query used"),
    budgetReport: z.any().describe("Token budget tracking report"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction, tokenBudget } = inputData;

    // Initialize token budget tracker
    const tracker = createTokenBudgetTracker(tokenBudget, 0.7);

    console.log(
      "[Enhanced Comprehensive] Starting initial research with budget tracking",
      {
        query: `${query.substring(0, 50)}...`,
        jurisdiction,
        tokenBudget,
      }
    );

    try {
      // Execute context search with 5K token budget
      const searchResults = await tavilyContextSearchTool.execute({
        context: {
          query,
          maxTokens: 5000,
          jurisdiction,
          timeRange: "year",
        },
        runtimeContext,
      });

      // Track token usage
      tracker.addUsage(
        "initial-research",
        searchResults.tokenCount,
        searchResults.truncated
      );

      // Log budget status
      tracker.logReport();

      return {
        context: searchResults.context,
        tokenCount: searchResults.tokenCount,
        truncated: searchResults.truncated,
        query: searchResults.query,
        budgetReport: tracker.getReport(),
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive] Initial research error:", error);

      return {
        context: "Initial research failed. Proceeding with limited context.",
        tokenCount: 0,
        truncated: false,
        query,
        budgetReport: tracker.getReport(),
      };
    }
  },
});

/**
 * Step 2: Conditional Summarization
 * Summarizes content if truncation detected OR token pressure is high
 */
const conditionalSummarizationStep = createStep({
  id: "conditional-summarization",
  description:
    "Intelligently summarize content if truncation or token pressure detected",
  inputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
    budgetReport: z.any(),
  }),
  outputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
    summarized: z.boolean(),
    compressionRatio: z.number().optional(),
    budgetReport: z.any(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { context, tokenCount, truncated, query, budgetReport } = inputData;
    const { tokenBudget } = getInitData();

    // Recreate tracker from report
    const tracker = createTokenBudgetTracker(tokenBudget, 0.7);
    tracker.addUsage("initial-research", tokenCount, truncated);

    // Determine if summarization is needed
    const shouldSummarize =
      truncated || // Content was truncated
      tracker.shouldSummarize(0.6) || // Token pressure > 60%
      tokenCount > 4000; // Content is very large

    if (!shouldSummarize) {
      console.log(
        "[Enhanced Comprehensive] Summarization not needed - proceeding with original content"
      );
      return {
        context,
        tokenCount,
        truncated,
        query,
        summarized: false,
        budgetReport: tracker.getReport(),
      };
    }

    console.log("[Enhanced Comprehensive] Summarization triggered", {
      reason: truncated
        ? "content truncated"
        : tracker.shouldSummarize(0.6)
        ? "token pressure"
        : "large content",
      originalTokens: tokenCount,
    });

    try {
      // Summarize with specialized agent
      const summarizationPrompt = `Summarize this legal research while preserving ALL critical information:

${context}

Target: 50-70% token reduction. Keep ALL case names, statutory references, dates, and key legal principles.`;

      const summarized = await summarizerAgent.generate(summarizationPrompt, {
        maxSteps: 1,
      });

      const summarizedTokens = estimateTokens(summarized.text);
      const compressionRatio = summarizedTokens / tokenCount;

      // Update tracker
      tracker.addUsage("summarization", summarizedTokens);

      console.log("[Enhanced Comprehensive] Summarization complete", {
        originalTokens: tokenCount,
        summarizedTokens,
        compressionRatio: compressionRatio.toFixed(2),
        tokensSaved: tokenCount - summarizedTokens,
      });

      return {
        context: summarized.text,
        tokenCount: summarizedTokens,
        truncated: false, // Summarization removes truncation
        query,
        summarized: true,
        compressionRatio,
        budgetReport: tracker.getReport(),
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive] Summarization error:", error);

      // Continue with original content if summarization fails
      return {
        context,
        tokenCount,
        truncated,
        query,
        summarized: false,
        budgetReport: tracker.getReport(),
      };
    }
  },
});

/**
 * Step 3: Analyze Gaps (same as original)
 */
const analyzeGapsStep = createStep({
  id: "analyze-gaps",
  description: "Analyze research results to identify gaps",
  inputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
    summarized: z.boolean(),
    compressionRatio: z.number().optional(),
    budgetReport: z.any(),
  }),
  outputSchema: z.object({
    context: z.string(),
    tokenCount: z.number(),
    truncated: z.boolean(),
    query: z.string(),
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
    budgetReport: z.any(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { context, tokenCount, truncated, query, summarized, budgetReport } =
      inputData;
    const { jurisdiction } = await Promise.resolve(getInitData());

    try {
      console.log("[Enhanced Comprehensive] Analyzing research gaps");

      const mockResults = [
        {
          title: "Initial Research Results",
          content: context,
          url: "",
        },
      ];

      const gaps = identifyResearchGaps({
        query,
        results: mockResults,
        jurisdiction,
      });

      const gapSummary = summarizeGaps(gaps);
      const shouldDeepDive = gaps.length > 2;
      const gapQueries = generateGapFillingQueries(gaps);

      console.log("[Enhanced Comprehensive] Gap analysis complete", {
        gapsFound: gaps.length,
        shouldDeepDive,
        gapQueriesCount: gapQueries.length,
      });

      return {
        context,
        tokenCount,
        truncated,
        query,
        summarized,
        gaps,
        gapSummary,
        shouldDeepDive,
        gapQueries,
        budgetReport,
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive] Gap analysis error:", error);

      return {
        context,
        tokenCount,
        truncated,
        query,
        summarized,
        gaps: [],
        gapSummary: "Gap analysis failed",
        shouldDeepDive: false,
        gapQueries: [],
        budgetReport,
      };
    }
  },
});

/**
 * Step 4: Enhance or Deep Dive with Token Tracking
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
    budgetReport: z.any(),
  }),
  outputSchema: z.object({
    initialContext: z.string(),
    enhancedContext: z.string().optional(),
    deepDiveContext1: z.string().optional(),
    deepDiveContext2: z.string().optional(),
    totalTokens: z.number(),
    path: z.enum(["enhance", "deep-dive"]),
    budgetReport: z.any(),
  }),
  execute: async ({ inputData, getInitData, runtimeContext }) => {
    const { context, tokenCount, shouldDeepDive, gapQueries, budgetReport } =
      inputData;
    const { jurisdiction, tokenBudget } = getInitData();

    // Recreate tracker
    const tracker = createTokenBudgetTracker(tokenBudget, 0.7);
    tracker.addUsage("previous-steps", tokenCount);

    // Check remaining budget
    const remaining = tracker.getRemaining();
    console.log("[Enhanced Comprehensive] Remaining budget:", remaining);

    // Adjust search budget based on remaining tokens
    const searchBudget = Math.min(5000, Math.floor(remaining * 0.6));

    if (shouldDeepDive) {
      console.log("[Enhanced Comprehensive] Taking deep-dive path (gaps > 2)");

      try {
        const query1 = gapQueries[0] || `${inputData.query} detailed analysis`;
        const query2 =
          gapQueries[1] || `${inputData.query} case law precedents`;

        const [results1, results2] = await Promise.all([
          tavilyContextSearchTool.execute({
            context: {
              query: query1,
              maxTokens: searchBudget,
              jurisdiction,
              timeRange: "year",
            },
            runtimeContext,
          }),
          tavilyContextSearchTool.execute({
            context: {
              query: query2,
              maxTokens: searchBudget,
              jurisdiction,
              timeRange: "year",
            },
            runtimeContext,
          }),
        ]);

        tracker.addUsage(
          "deep-dive-1",
          results1.tokenCount,
          results1.truncated
        );
        tracker.addUsage(
          "deep-dive-2",
          results2.tokenCount,
          results2.truncated
        );

        const totalTokens = tracker.getReport().totalUsed;

        console.log("[Enhanced Comprehensive] Deep dive complete", {
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
          budgetReport: tracker.getReport(),
        };
      } catch (error) {
        console.error("[Enhanced Comprehensive] Deep dive error:", error);

        return {
          initialContext: context,
          enhancedContext: undefined,
          deepDiveContext1: undefined,
          deepDiveContext2: undefined,
          totalTokens: tokenCount,
          path: "deep-dive" as const,
          budgetReport: tracker.getReport(),
        };
      }
    } else {
      console.log("[Enhanced Comprehensive] Taking enhance path (gaps <= 2)");

      try {
        const enhanceQuery = gapQueries[0] || inputData.query;

        const enhancedResults = await tavilyContextSearchTool.execute({
          context: {
            query: enhanceQuery,
            maxTokens: searchBudget,
            jurisdiction,
            timeRange: "year",
          },
          runtimeContext,
        });

        tracker.addUsage(
          "enhancement",
          enhancedResults.tokenCount,
          enhancedResults.truncated
        );

        console.log("[Enhanced Comprehensive] Enhancement complete", {
          enhancedTokens: enhancedResults.tokenCount,
          totalTokens: tracker.getReport().totalUsed,
        });

        return {
          initialContext: context,
          enhancedContext: enhancedResults.context,
          deepDiveContext1: undefined,
          deepDiveContext2: undefined,
          totalTokens: tracker.getReport().totalUsed,
          path: "enhance" as const,
          budgetReport: tracker.getReport(),
        };
      } catch (error) {
        console.error("[Enhanced Comprehensive] Enhancement error:", error);

        return {
          initialContext: context,
          enhancedContext: undefined,
          deepDiveContext1: undefined,
          deepDiveContext2: undefined,
          totalTokens: tokenCount,
          path: "enhance" as const,
          budgetReport: tracker.getReport(),
        };
      }
    }
  },
});

/**
 * Step 5: Final Summarization Before Synthesis
 * Ensures all content is within reasonable bounds for high-quality synthesis
 */
const finalSummarizationStep = createStep({
  id: "final-summarization",
  description: "Summarize all research content before final synthesis",
  inputSchema: z.object({
    initialContext: z.string(),
    enhancedContext: z.string().optional(),
    deepDiveContext1: z.string().optional(),
    deepDiveContext2: z.string().optional(),
    totalTokens: z.number(),
    path: z.enum(["enhance", "deep-dive"]),
    budgetReport: z.any(),
  }),
  outputSchema: z.object({
    summarizedContent: z.string(),
    totalTokens: z.number(),
    path: z.enum(["enhance", "deep-dive"]),
    budgetReport: z.any(),
  }),
  execute: async ({ inputData, getInitData }) => {
    const {
      initialContext,
      enhancedContext,
      deepDiveContext1,
      deepDiveContext2,
      totalTokens,
      path,
      budgetReport,
    } = inputData;
    const { tokenBudget } = getInitData();

    const tracker = createTokenBudgetTracker(tokenBudget, 0.7);
    tracker.addUsage("previous-steps", totalTokens);

    // Check if final summarization is needed
    const shouldSummarize =
      tracker.shouldSummarize(0.75) || totalTokens > 15_000;

    if (!shouldSummarize) {
      console.log(
        "[Enhanced Comprehensive] Final summarization not needed - proceeding to synthesis"
      );

      // Concatenate all contexts
      let combinedContent = `## Initial Research\n${initialContext}\n\n`;
      if (path === "enhance" && enhancedContext) {
        combinedContent += `## Enhanced Research\n${enhancedContext}\n\n`;
      } else if (path === "deep-dive") {
        if (deepDiveContext1) {
          combinedContent += `## Deep Dive Research - Part 1\n${deepDiveContext1}\n\n`;
        }
        if (deepDiveContext2) {
          combinedContent += `## Deep Dive Research - Part 2\n${deepDiveContext2}\n\n`;
        }
      }

      return {
        summarizedContent: combinedContent,
        totalTokens,
        path,
        budgetReport: tracker.getReport(),
      };
    }

    console.log(
      "[Enhanced Comprehensive] Final summarization triggered before synthesis",
      {
        totalTokens,
        utilization: `${(tracker.getUtilization() * 100).toFixed(1)}%`,
      }
    );

    try {
      // Build comprehensive content for summarization
      let allContent = `## Initial Research\n${initialContext}\n\n`;
      if (path === "enhance" && enhancedContext) {
        allContent += `## Enhanced Research\n${enhancedContext}\n\n`;
      } else if (path === "deep-dive") {
        if (deepDiveContext1) {
          allContent += `## Deep Dive Research - Part 1\n${deepDiveContext1}\n\n`;
        }
        if (deepDiveContext2) {
          allContent += `## Deep Dive Research - Part 2\n${deepDiveContext2}\n\n`;
        }
      }

      // Summarize all content
      const summarizationPrompt = `Summarize this comprehensive legal research while preserving ALL critical information:

${allContent}

Create a structured summary that:
1. Preserves ALL case names, citations, and statutory references
2. Keeps ALL URLs and sources
3. Maintains logical organization
4. Reduces verbosity by 40-50%
5. Ensures no information loss`;

      const summarized = await summarizerAgent.generate(summarizationPrompt, {
        maxSteps: 1,
      });

      const summarizedTokens = estimateTokens(summarized.text);
      tracker.addUsage("final-summarization", summarizedTokens);

      console.log("[Enhanced Comprehensive] Final summarization complete", {
        originalTokens: totalTokens,
        summarizedTokens,
        compressionRatio: (summarizedTokens / totalTokens).toFixed(2),
        tokensSaved: totalTokens - summarizedTokens,
      });

      return {
        summarizedContent: summarized.text,
        totalTokens: tracker.getReport().totalUsed,
        path,
        budgetReport: tracker.getReport(),
      };
    } catch (error) {
      console.error(
        "[Enhanced Comprehensive] Final summarization error:",
        error
      );

      // Fallback to concatenated content
      let combinedContent = `## Initial Research\n${initialContext}\n\n`;
      if (path === "enhance" && enhancedContext) {
        combinedContent += `## Enhanced Research\n${enhancedContext}\n\n`;
      } else if (path === "deep-dive") {
        if (deepDiveContext1) {
          combinedContent += `## Deep Dive Research - Part 1\n${deepDiveContext1}\n\n`;
        }
        if (deepDiveContext2) {
          combinedContent += `## Deep Dive Research - Part 2\n${deepDiveContext2}\n\n`;
        }
      }

      return {
        summarizedContent: combinedContent,
        totalTokens,
        path,
        budgetReport: tracker.getReport(),
      };
    }
  },
});

/**
 * Step 6: Document Synthesis
 */
const documentStep = createStep({
  id: "document",
  description: "Synthesize all research into comprehensive document",
  inputSchema: z.object({
    summarizedContent: z.string(),
    totalTokens: z.number(),
    path: z.enum(["enhance", "deep-dive"]),
    budgetReport: z.any(),
  }),
  outputSchema: z.object({
    response: z.string().describe("Comprehensive synthesized document"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
    path: z.enum(["enhance", "deep-dive"]).describe("Path taken in workflow"),
    budgetReport: z.any().describe("Final token budget report"),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { summarizedContent, totalTokens, path, budgetReport } = inputData;
    const { query } = getInitData();

    try {
      console.log("[Enhanced Comprehensive] Creating final document", {
        path,
        totalTokensSoFar: totalTokens,
      });

      const synthesisPrompt = `Create a comprehensive legal research document for: "${query}"

${summarizedContent}

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

      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 1,
      });

      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const finalTotalTokens = totalTokens + synthesisTokens;

      console.log("[Enhanced Comprehensive] Document creation complete", {
        synthesisTokens,
        finalTotalTokens,
        withinBudget:
          finalTotalTokens <= (budgetReport as TokenBudgetReport).totalBudget,
      });

      return {
        response: synthesized.text,
        totalTokens: finalTotalTokens,
        path,
        budgetReport,
      };
    } catch (error) {
      console.error("[Enhanced Comprehensive] Document creation error:", error);

      return {
        response: summarizedContent,
        totalTokens,
        path,
        budgetReport,
      };
    }
  },
});

/**
 * Enhanced Comprehensive Analysis Workflow
 *
 * Executes: initial-research → conditional-summarization → analyze-gaps →
 *           enhance-or-deep-dive → final-summarization → document
 *
 * Token Budget: 18K-25K tokens (adaptive)
 * Latency Target: 25-50s
 */
export const enhancedComprehensiveWorkflow = createWorkflow({
  id: "enhanced-comprehensive-workflow",
  inputSchema: z.object({
    query: z.string().describe("The research query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
    tokenBudget: z
      .number()
      .default(20_000)
      .describe("Total token budget for workflow"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Comprehensive synthesized document"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
    path: z.enum(["enhance", "deep-dive"]).describe("Path taken in workflow"),
    budgetReport: z.any().describe("Final token budget report"),
  }),
})
  .then(initialResearchStep)
  .then(conditionalSummarizationStep)
  .then(analyzeGapsStep)
  .then(enhanceOrDeepDiveStep)
  .then(finalSummarizationStep)
  .then(documentStep)
  .commit();
