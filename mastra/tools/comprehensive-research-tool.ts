import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { highAdvanceSearchWorkflow } from "../workflows/high-advance-search-workflow";

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
    "Performs BROAD ANALYSIS across 6+ DIVERSE SOURCES to identify TRENDS and PATTERNS. " +
    "Excels at COMPARING information across sources and SYNTHESIZING multiple perspectives. " +
    "Use for: identifying trends, comparing perspectives, pattern recognition, broad surveys. " +
    "Best when you need to understand how DIFFERENT SOURCES view a topic or find COMMON THEMES. " +
    "Returns comprehensive synthesis with trend analysis and extensive source citations. " +
    "Token budget: 5K-10K tokens. NOT for dense content extraction (use deepResearch for that).",

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
        })
      )
      .describe("Source citations (6+ authoritative sources)"),
    totalTokens: z.number().describe("Total tokens used"),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;

    console.log(
      `[Comprehensive Research Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );

    try {
      const run = await highAdvanceSearchWorkflow.createRunAsync();
      console.log(
        "[Comprehensive Research Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
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

      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Comprehensive Research Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
        response: string;
        sources: Array<{ title: string; url: string }>;
        totalTokens: number;
      };

      console.log(
        `[Comprehensive Research Tool] Successfully completed. Response length: ${output.response.length} chars, Sources: ${output.sources.length}, Tokens: ${output.totalTokens}`
      );

      return {
        response: output.response,
        sources: output.sources,
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
        totalTokens: 0,
      };
    }
  },
});
