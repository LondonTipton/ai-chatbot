import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { advancedSearchWorkflowV2 } from "../workflows/advanced-search-workflow-v2";

/**
 * Deep Research Tool (Advanced Search Workflow)
 *
 * 🎯 PURPOSE: FACTUAL, CONTENT-DENSE extraction and analysis
 *
 * Single-step workflow for deep analysis of detailed legal content.
 * Excels at EXTRACTING specific information from dense sources.
 * Executes: 4-5 searches → content extraction → detailed analysis
 *
 * Search Depth: 4-5 search results
 * Token Budget: 4K-8K tokens
 * Latency: 5-10 seconds
 *
 * 🎯 Best For:
 * - EXTRACTING specific provisions from statutes/acts
 * - ANALYZING dense legal documents in detail
 * - PICKING APART technical legal requirements
 * - DEEP DIVE into specific case law or precedents
 * - Content-heavy analysis where precision matters
 * - Breaking down complex legal frameworks
 *
 * ❌ NOT Best For:
 * - Broad surveys across many sources (use comprehensiveResearch)
 * - Identifying trends or patterns (use comprehensiveResearch)
 * - Comparative analysis (use comprehensiveResearch)
 *
 * Examples:
 * - "Analyze the specific provisions of Section 12B Labour Act"
 * - "Extract requirements from the Companies Act for registration"
 * - "What are the exact elements of breach of contract?"
 * - "Detail the procedural steps in civil litigation"
 * - "Break down constitutional provisions on property rights"
 */
export const deepResearchTool = createTool({
  id: "deep-research",
  description:
    "Deep analysis of dense legal content and specific provisions with FULL SOURCE TEXT. " +
    "Use for: 'Analyze...', 'Extract...', 'Break down...', detailed case law, specific statutory provisions. " +
    "Analyzes 10 search results WITH complete source text for precise extraction and detailed analysis. " +
    "Speed: 3-5 seconds | Tokens: 3-5K | Best for: Extracting precise information from dense legal sources. " +
    "NOT for: Simple questions (use quickFactSearch), overviews (use standardResearch), or trend analysis (use comprehensiveResearch).",

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The research query requiring analysis, case law, or comprehensive understanding"
      ),
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
    response: z
      .string()
      .describe("Detailed synthesized response with analysis"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Source citations (typically 4-5 authoritative sources)"),
    totalTokens: z.number().describe("Total tokens used"),
  }),

  execute: async (executionContext: any) => {
    const { context } = executionContext;
    const {
      query,
      jurisdiction = "Zimbabwe",
      conversationHistory: providedHistory = [],
    } = context;

    // Extract conversation history from agentContext if not provided in context
    // Priority: context.conversationHistory > agentContext.conversationHistory > empty array
    const conversationHistory =
      providedHistory.length > 0
        ? providedHistory
        : executionContext?.agentContext?.conversationHistory || [];

    console.log(
      `[Deep Research Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );
    console.log(
      `[Deep Research Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      // Create and execute the V2 workflow
      const run = await advancedSearchWorkflowV2.createRunAsync();
      console.log(
        "[Deep Research Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
        },
      });

      console.log(
        `[Deep Research Tool] Workflow completed with status: ${result.status}`
      );

      // Handle workflow failure
      if (result.status !== "success") {
        console.error(
          `[Deep Research Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Deep research workflow failed with status: ${result.status}`
        );
      }

      // Extract output from the search step (V2 workflow)
      const searchStep = result.steps.search;

      if (!searchStep || searchStep.status !== "success") {
        console.error(
          `[Deep Research Tool] Search step failed or not found. Step status: ${searchStep?.status}`
        );
        throw new Error("Search step failed or not found");
      }

      const output = searchStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[Deep Research Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Total tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      // Comprehensive error handling with logging
      console.error("[Deep Research Tool] Error executing workflow:", error);

      // Return graceful error message in tool output format
      return {
        response:
          "I encountered an error while researching your question. Please try rephrasing your query or try again later.",
        sources: [],
        totalTokens: 0,
      };
    }
  },
});
