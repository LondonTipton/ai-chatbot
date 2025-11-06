import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { advancedSearchWorkflow } from "../workflows/advanced-search-workflow";

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
    "Performs DEEP ANALYSIS of FACTUAL, CONTENT-DENSE legal information with 4-5 sources. " +
    "Excels at EXTRACTING specific facts, provisions, and requirements from detailed sources. " +
    "Use for: analyzing dense statutes, extracting case law details, breaking down technical requirements. " +
    "Best when you need to PICK APART content and extract precise information. " +
    "Returns detailed analysis with extracted content and authoritative citations. " +
    "Token budget: 4K-8K tokens. NOT for trend analysis (use comprehensiveResearch for trends).",

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

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;

    console.log(
      `[Deep Research Tool] Starting workflow for query: "${query}", jurisdiction: "${jurisdiction}"`
    );

    try {
      // Create and execute the workflow
      const run = await advancedSearchWorkflow.createRunAsync();
      console.log(
        "[Deep Research Tool] Workflow run created, starting execution..."
      );

      const result = await run.start({
        inputData: {
          query,
          jurisdiction,
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

      // Extract output from the synthesize step (last step in workflow)
      const synthesizeStep = result.steps.synthesize;

      if (!synthesizeStep || synthesizeStep.status !== "success") {
        console.error(
          `[Deep Research Tool] Synthesize step failed or not found. Step status: ${synthesizeStep?.status}`
        );
        throw new Error("Synthesize step failed or not found");
      }

      const output = synthesizeStep.output as {
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
