import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { getZimbabweLegalDomains } from "@/lib/utils/zimbabwe-domains";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilyExtractTool } from "../tools/tavily-extract";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Advanced Search Workflow
 *
 * Token Budget: 4K-8K tokens
 * Steps: advanced-search → extract-top-sources → synthesize
 * Latency: 5-10s
 *
 * This workflow provides balanced research with comprehensive sources by:
 * 1. Performing advanced search with Zimbabwe domain filtering
 * 2. Extracting content from top 2 URLs (optional, skips if no URLs)
 * 3. Synthesizing results into a detailed answer
 *
 * Requirements: 6.2
 */

/**
 * Step 1: Advanced Search
 * Performs advanced Tavily search with Zimbabwe domains, timeRange='year', country='ZW'
 * Token estimate: 2K-4K tokens
 */
const advancedSearchStep = createStep({
  id: "advanced-search",
  description:
    "Perform advanced web search with Zimbabwe legal domain filtering",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    answer: z.string().describe("AI-generated comprehensive answer"),
    results: z
      .array(
        z.object({
          position: z.number(),
          title: z.string(),
          url: z.string(),
          content: z.string(),
          relevanceScore: z.number(),
          publishedDate: z.string(),
        })
      )
      .describe("Array of detailed search results"),
    totalResults: z.number(),
    tokenEstimate: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      // Execute advanced search with Zimbabwe-specific configuration
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: `${query} ${jurisdiction}`,
          maxResults: 7,
          jurisdiction,
          includeRawContent: true, // Required for content extraction
          includeDomains: getZimbabweLegalDomains(),
          country: "ZW",
          timeRange: "year",
        },
        runtimeContext,
      });

      return {
        answer: searchResults.answer,
        results: searchResults.results,
        totalResults: searchResults.totalResults,
        tokenEstimate: searchResults.tokenEstimate,
      };
    } catch (error) {
      // Error handling: return partial results to allow workflow to continue
      console.error("[Advanced Search Workflow] Search step error:", error);

      return {
        answer: "",
        results: [],
        totalResults: 0,
        tokenEstimate: 0,
      };
    }
  },
});

/**
 * Step 2: Extract Top Sources
 * Extracts content from top 2 URLs (skips if no URLs available)
 * Token estimate: 1K-3K tokens
 */
const extractTopSourcesStep = createStep({
  id: "extract-top-sources",
  description: "Extract detailed content from top 2 search results",
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
    answer: z.string().describe("AI-generated answer from search"),
    results: z
      .array(
        z.object({
          position: z.number(),
          title: z.string(),
          url: z.string(),
          content: z.string(),
          relevanceScore: z.number(),
          publishedDate: z.string(),
        })
      )
      .describe("Search results"),
    totalResults: z.number(),
    tokenEstimate: z.number(),
    extractions: z
      .array(
        z.object({
          url: z.string(),
          rawContent: z.string(),
          tokenEstimate: z.number(),
        })
      )
      .describe("Extracted content from top URLs"),
    extractionTokens: z.number().describe("Tokens used for extraction"),
    skipped: z.boolean().describe("Whether extraction was skipped"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { answer, results, totalResults, tokenEstimate } = inputData;

    // Skip extraction if no results available
    if (!results || results.length === 0) {
      console.log(
        "[Advanced Search Workflow] No URLs available for extraction, skipping"
      );
      return {
        answer,
        results,
        totalResults,
        tokenEstimate,
        extractions: [],
        extractionTokens: 0,
        skipped: true,
      };
    }

    try {
      // Extract top 2 URLs
      const topUrls = results
        .slice(0, 2)
        .map((r) => r.url)
        .filter(Boolean);

      if (topUrls.length === 0) {
        return {
          answer,
          results,
          totalResults,
          tokenEstimate,
          extractions: [],
          extractionTokens: 0,
          skipped: true,
        };
      }

      const extractionResults = await tavilyExtractTool.execute({
        context: {
          urls: topUrls,
        },
        runtimeContext,
      });

      return {
        answer,
        results,
        totalResults,
        tokenEstimate,
        extractions: extractionResults.results,
        extractionTokens: extractionResults.totalTokens,
        skipped: false,
      };
    } catch (error) {
      // Error handling: continue with search results only
      console.error("[Advanced Search Workflow] Extraction step error:", error);
      console.log(
        "[Advanced Search Workflow] Continuing with search results only"
      );

      return {
        answer,
        results,
        totalResults,
        tokenEstimate,
        extractions: [],
        extractionTokens: 0,
        skipped: true,
      };
    }
  },
});

/**
 * Step 3: Synthesize
 * Uses the synthesizer agent to create comprehensive answer from search and extraction results
 * Token estimate: 1K-1.5K tokens
 */
const synthesizeStep = createStep({
  id: "synthesize",
  description:
    "Synthesize search and extraction results into comprehensive answer",
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
    const {
      answer,
      results,
      tokenEstimate,
      extractions,
      extractionTokens,
      skipped,
    } = inputData;
    const initData = getInitData();
    const { query } = initData;

    try {
      // Prepare synthesis prompt with search results and optional extractions
      let synthesisPrompt = `Create comprehensive answer for Zimbabwe legal query: "${query}"

Search Results:
${
  results.length > 0 ? JSON.stringify(results, null, 2) : "No results available"
}

AI Answer: ${answer || "No answer generated"}`;

      // Add extracted content if available
      if (!skipped && extractions.length > 0) {
        synthesisPrompt += `

Extracted Content from Top Sources:
${JSON.stringify(extractions, null, 2)}`;
      }

      synthesisPrompt += `

Provide detailed answer with proper citations and Zimbabwe legal context.`;

      // Generate synthesis with maxSteps=1
      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 1,
      });

      // Extract sources from results
      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      // Calculate total tokens
      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const totalTokens = tokenEstimate + extractionTokens + synthesisTokens;

      return {
        response: synthesized.text,
        sources,
        totalTokens,
      };
    } catch (error) {
      // Error handling: return best available response
      console.error("[Advanced Search Workflow] Synthesize step error:", error);

      // Fallback: return raw answer if synthesis fails
      const fallbackResponse =
        answer || "Unable to generate response. Please try again.";

      const sources = results.map((r: any) => ({
        title: r.title,
        url: r.url,
      }));

      return {
        response: fallbackResponse,
        sources,
        totalTokens: tokenEstimate + extractionTokens,
      };
    }
  },
});

/**
 * Advanced Search Workflow
 *
 * Executes: advanced-search → extract-top-sources → synthesize
 * Token Budget: 4K-8K tokens
 * Latency Target: 5-10s
 */
export const advancedSearchWorkflow = createWorkflow({
  id: "advanced-search-workflow",
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
  .then(advancedSearchStep)
  .then(extractTopSourcesStep)
  .then(synthesizeStep)
  .commit();
