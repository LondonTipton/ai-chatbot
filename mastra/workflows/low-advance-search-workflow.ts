import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Low-Advance Search Workflow
 *
 * Token Budget: 2K-4K tokens
 * Steps: search → synthesize
 * Latency: 4-7s
 *
 * This workflow provides balanced research with moderate depth by:
 * 1. Performing advanced search with 5 results (including raw content)
 * 2. Synthesizing results into a comprehensive answer
 *
 * Use when:
 * - Query needs more than basic search (3 results) but not full advanced (7 results)
 * - Moderate token budget
 * - Faster than advanced search but more comprehensive than basic
 */

/**
 * Step 1: Advanced Search (5 results)
 * Token estimate: 1.5K-2.5K tokens
 */
const searchStep = createStep({
  id: "search",
  description: "Perform advanced web search with 5 results",
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
        })
      )
      .describe("Array of search results"),
    totalResults: z.number(),
    tokenEstimate: z.number(),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      // Execute advanced search with 5 results, no raw content
      const searchResults = await tavilySearchAdvancedTool.execute({
        context: {
          query: `${query} ${jurisdiction}`,
          maxResults: 5,
          domainStrategy: "strict",
          researchDepth: "standard",
          country: "ZW",
          jurisdiction,
          includeRawContent: true,
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
      console.error("[Low-Advance Search Workflow] Search step error:", error);

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
 * Step 2: Synthesize
 * Token estimate: 800-1.5K tokens
 */
const synthesizeStep = createStep({
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
    response: z.string().describe("Synthesized response"),
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

Search Results:
${
  results.length > 0 ? JSON.stringify(results, null, 2) : "No results available"
}

AI Answer: ${answer || "No answer generated"}

Provide detailed answer with proper citations and Zimbabwe legal context.`;

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
        "[Low-Advance Search Workflow] Synthesize step error:",
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
 * Low-Advance Search Workflow
 *
 * Executes: search (5 results) → synthesize
 * Token Budget: 2K-4K tokens
 * Latency Target: 4-7s
 */
export const lowAdvanceSearchWorkflow = createWorkflow({
  id: "low-advance-search-workflow",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    response: z.string().describe("Synthesized response"),
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
  .then(synthesizeStep)
  .commit();
