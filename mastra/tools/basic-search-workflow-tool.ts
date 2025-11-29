import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { basicSearchWorkflowV2 } from "../workflows/basic-search-workflow-v2";

/**
 * Basic Search Workflow Tool
 *
 * Wraps the Basic Search Workflow as a Mastra tool for simple queries.
 * This tool executes the workflow (search → synthesize) and returns results.
 *
 * Token Budget: 1K-2.5K tokens
 * Latency: 3-5 seconds
 *
 * Use this tool when:
 * - User asks simple factual questions
 * - Query requires quick research with few sources
 * - Speed is more important than depth
 * - Token budget is limited
 */
export const basicSearchWorkflowTool = createTool({
  id: "basic-search-workflow",
  description:
    "Performs basic legal research with 3 sources and quick synthesis. " +
    "Use this for simple factual questions that need quick answers with citations. " +
    "Returns a synthesized response with source citations. " +
    "Token budget: 1K-2.5K tokens. Best for straightforward queries requiring fast responses.",

  inputSchema: z.object({
    query: z.string().describe("The research query to investigate"),
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
      `[Basic Search Workflow Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );
    console.log(
      `[Basic Search Workflow Tool] Conversation history: ${
        conversationHistory.length
      } messages (source: ${
        providedHistory.length > 0 ? "context" : "agentContext"
      })`
    );

    try {
      // Create and execute the V2 workflow
      const run = await basicSearchWorkflowV2.createRunAsync();
      console.log(
        "[Basic Search Workflow Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
          conversationHistory,
        },
      });

      console.log(
        `[Basic Search Workflow Tool] Workflow completed with status: ${result.status}`
      );

      // Handle workflow failure
      if (result.status !== "success") {
        console.error(
          `[Basic Search Workflow Tool] Workflow failed with status: ${result.status}`
        );
        throw new Error(
          `Basic search workflow failed with status: ${result.status}`
        );
      }

      // Extract output from the search step (V2 workflow)
      const searchStep = result.steps.search;

      if (!searchStep || searchStep.status !== "success") {
        console.error(
          `[Basic Search Workflow Tool] Search step failed or not found. Step status: ${searchStep?.status}`
        );
        throw new Error("Search step failed or not found");
      }

      const output = searchStep.output as {
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
          ...source,
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
        `[Basic Search Workflow Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Raw results: ${topRawResults.length}, Total tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: enhancedSources,
        rawResults: topRawResults,
        enhancedQuery: query, // Pass through for context
        totalTokens: output.totalTokens,
      };
    } catch (error) {
      // Comprehensive error handling with logging
      console.error(
        "[Basic Search Workflow Tool] Error executing workflow:",
        error
      );

      // Return graceful error message in tool output format
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
