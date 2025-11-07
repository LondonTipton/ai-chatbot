import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  createClaimExtractionStep,
  createDocumentCompositionStep,
  createEntityExtractionStep,
  createEntityValidationStep,
} from "@/lib/utils/workflow-entity-steps";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * High-Advance Search Workflow
 *
 * Token Budget: 5K-10K tokens
 * Steps: search → synthesize
 * Latency: 8-15s
 *
 * This workflow provides comprehensive research with maximum breadth by:
 * 1. Performing advanced search with 10 results (no raw content)
 * 2. Synthesizing results into a comprehensive answer
 *
 * Use when:
 * - Query needs maximum source coverage
 * - Multiple perspectives required
 * - Comprehensive analysis without full extraction
 * - Higher token budget acceptable
 */

/**
 * Step 1: Advanced Search (10 results)
 * Token estimate: 3K-6K tokens
 */
const searchStep = createStep({
  id: "search",
  description: "Perform advanced web search with 10 results",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    answer: z.string().describe("AI-generated answer"),
    results: z
      .array(
        z.object({
          position: z.number(),
          title: z.string(),
          url: z.string(),
          content: z.string(),
          relevanceScore: z.number(),
          publishedDate: z.string(),
          sourceType: z.enum([
            "court-case",
            "academic",
            "news",
            "government",
            "other",
          ]),
        })
      )
      .describe("Array of search results"),
    totalResults: z.number(),
    tokenEstimate: z.number(),
    extractions: z.array(
      z.object({
        url: z.string(),
        rawContent: z.string(),
        tokenEstimate: z.number(),
      })
    ),
    extractionTokens: z.number(),
    skipped: z.boolean(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      // Execute advanced search with 10 results, no raw content
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: `${query} ${jurisdiction}`,
          maxResults: 20,
          domainStrategy: "prioritized",
          researchDepth: "comprehensive",
          jurisdiction,
          includeRawContent: false,
        },
        runtimeContext,
      });

      return {
        answer: searchResults.answer,
        results: searchResults.results.map((result: any) => ({
          ...result,
          sourceType: result.sourceType || "other",
        })),
        totalResults: searchResults.totalResults,
        tokenEstimate: searchResults.tokenEstimate,
        extractions: [],
        extractionTokens: 0,
        skipped: true,
      };
    } catch (error) {
      console.error("[High-Advance Search Workflow] Search step error:", error);

      return {
        answer: "",
        results: [],
        totalResults: 0,
        tokenEstimate: 0,
        extractions: [],
        extractionTokens: 0,
        skipped: true,
      };
    }
  },
});

/**
 * LEGACY Step 2: Synthesize (not used in new pipeline)
 * Replaced by: extract-entities → validate → extract-claims → compose
 */
const _legacySynthesizeStep = createStep({
  id: "synthesize",
  description: "Synthesize search results into comprehensive answer",
  inputSchema: z.object({
    answer: z.string(),
    results: z.array(
      z.object({
        position: z.number(),
        title: z.string(),
        url: z.string(),
        content: z.string(),
        relevanceScore: z.number(),
        publishedDate: z.string(),
      })
    ),
    totalResults: z.number(),
    tokenEstimate: z.number(),
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
      .describe("Source citations"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
  }),
  execute: async ({ inputData, getInitData }) => {
    const { answer, results, tokenEstimate } = inputData;
    const initData = getInitData();
    const { query } = initData;

    try {
      const synthesisPrompt = `Create comprehensive answer for Zimbabwe legal query: "${query}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 SEARCH RESULTS (10 SOURCES - READ FIRST)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  results.length > 0 ? JSON.stringify(results, null, 2) : "No results available"
}

${
  answer
    ? `INITIAL AI ANSWER (verify facts):
${answer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : ""
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL RULES - READ BEFORE RESPONDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MANDATORY:
1. ONLY use information from sources above
2. Cite every claim: [Source: URL]
3. Use case names EXACTLY as written
4. If case name not in sources, DO NOT mention it
5. NEVER fabricate case names, citations, or URLs

❌ FORBIDDEN:
- Adding information not in sources
- Creating plausible case names
- Inventing citations

Provide detailed, comprehensive answer with proper citations. Synthesize from all 10 sources.`;

      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 1,
      });

      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const totalTokens = tokenEstimate + synthesisTokens;

      return {
        response: synthesized.text,
        sources,
        totalTokens,
      };
    } catch (error) {
      console.error(
        "[High-Advance Search Workflow] Synthesize step error:",
        error
      );

      const fallbackResponse =
        answer || "Unable to generate response. Please try again.";

      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      return {
        response: fallbackResponse,
        sources,
        totalTokens: tokenEstimate,
      };
    }
  },
});

/**
 * High-Advance Search Workflow (UPDATED with Structured Entity Extraction)
 *
 * NEW PIPELINE: search → extract-entities → validate → extract-claims → compose
 * OLD PIPELINE: search → synthesize (legacy)
 *
 * Token Budget: 6K-12K tokens (increased due to structured extraction)
 * Latency Target: 9-17s (slightly increased for entity extraction)
 *
 * Expected hallucination rate: <2% (down from <5%)
 */
export const highAdvanceSearchWorkflow = createWorkflow({
  id: "high-advance-search-workflow",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
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
      .describe("Source citations"),
    totalTokens: z.number().describe("Total tokens used in workflow"),
  }),
})
  .then(searchStep)
  .then(createEntityExtractionStep("high-extract-entities"))
  .then(createEntityValidationStep("high-validate-entities"))
  .then(createClaimExtractionStep("high-extract-claims"))
  .then(createDocumentCompositionStep("high-compose-document"))
  .commit();
