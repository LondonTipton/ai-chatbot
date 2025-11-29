import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { comprehensiveAnalysisWorkflowV2 } from "../workflows/comprehensive-analysis-workflow-v2";

/**
 * Comprehensive Research Tool (High Advance Search Workflow)
 *
 * 🎯 PURPOSE: BROAD analysis across MULTIPLE SOURCES to identify TRENDS
 *
 * Single-step workflow for broad synthesis across many sources.
 * Excels at COMPARING information and IDENTIFYING PATTERNS/TRENDS.
 * Executes: 6+ searches → broad extraction → trend synthesis
 *
 * Search Depth: 6+ search results
 * Token Budget: 5K-10K tokens
 * Latency: 8-15 seconds
 *
 * 🎯 Best For:
 * - IDENTIFYING TRENDS across multiple sources
 * - COMPARING perspectives from different sources
 * - SYNTHESIZING information from diverse sources
 * - PATTERN RECOGNITION in legal developments
 * - Broad overview with maximum source coverage
 * - Understanding how different authorities view a topic
 *
 * ❌ NOT Best For:
 * - Deep analysis of single dense document (use deepResearch)
 * - Extracting specific provisions (use deepResearch)
 * - Technical requirement extraction (use deepResearch)
 *
 * Examples:
 * - "What are the trends in labor law reforms across sources?"
 * - "How do different courts interpret property rights?"
 * - "Compare perspectives on constitutional amendments"
 * - "What patterns emerge in employment dispute cases?"
 * - "Survey the landscape of contract law developments"
 */
export const comprehensiveResearchTool = createTool({
  id: "comprehensive-research",
  description:
    "Broad analysis across MANY SOURCES (10-20 results) to identify TRENDS and PATTERNS. " +
    "Use for: 'What are trends...', 'Compare perspectives...', 'Survey...', pattern recognition across sources. " +
    "Performs multiple searches with gap analysis to ensure comprehensive coverage. " +
    "Speed: 8-15 seconds | Tokens: 5-10K | Best for: Understanding how different sources view a topic and identifying common themes. " +
    "NOT for: Simple questions (use quickFactSearch), explanations (use standardResearch), or dense content extraction (use deepResearch).",

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The research query requiring comprehensive analysis with maximum source coverage"
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
      .describe("Comprehensive synthesized response with thorough analysis"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z
            .string()
            .optional()
            .describe("Content excerpt from source"),
          score: z.number().optional().describe("Relevance score"),
        })
      )
      .describe("Source citations with excerpts"),
    rawResults: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          score: z.number().optional(),
          publishedDate: z.string().optional(),
        })
      )
      .optional()
      .describe("Original Tavily results for grounding and verification"),
    enhancedQuery: z
      .string()
      .optional()
      .describe("Enhanced query used for search"),
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
      `[Comprehensive Research Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );
    console.log(
      `[Comprehensive Research Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      const run = await comprehensiveAnalysisWorkflowV2.createRunAsync();
      console.log(
        "[Comprehensive Research Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
        },
      });

      console.log(
        `[Comprehensive Research Tool] Workflow completed with status: ${result.status}`
      );

      if (result.status !== "success") {
        console.error(
          `[Comprehensive Research Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Comprehensive research workflow failed with status: ${result.status}`
        );
      }

      const finalStep = result.steps["follow-up-searches"];

      if (!finalStep || finalStep.status !== "success") {
        console.error(
          `[Comprehensive Research Tool] Follow-up searches step failed or not found. Step status: ${finalStep?.status}`
        );
        throw new Error("Follow-up searches step failed or not found");
      }

      const output = finalStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
        rawResults?: any;
      };

      // Extract raw Tavily results for grounding
      const rawTavilyResults = output.rawResults?.results || [];

      // Enhance sources with content excerpts and scores
      // Preserve all source fields including metadata for legal DB sources
      const enhancedSources = output.sources.map((source: any) => {
        const rawResult = rawTavilyResults.find(
          (r: any) => r.url === source.url
        );
        return {
          ...source, // Preserve all original fields (including metadata for legal DB)
          title: source.title,
          url: source.url,
          content:
            rawResult?.content?.substring(0, 500) ||
            source.text?.substring(0, 500) ||
            "",
          score: rawResult?.score || source.score,
        };
      });

      // Prepare raw results for Chat Agent (limit to top 5 for token efficiency)
      const topRawResults = rawTavilyResults.slice(0, 5).map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content || "",
        score: r.score,
        publishedDate: r.published_date,
      }));

      console.log(
        `[Comprehensive Research Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Raw results: ${topRawResults.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: enhancedSources,
        rawResults: topRawResults,
        enhancedQuery: query, // Pass through for context
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      console.error(
        "[Comprehensive Research Tool] Error executing workflow:",
        error
      );

      return {
        response:
          "I encountered an error while researching your question. Please try rephrasing your query or try again later.",
        sources: [],
        rawResults: [],
        totalTokens: 0,
      };
    }
  },
});
