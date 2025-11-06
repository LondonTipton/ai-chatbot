import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { synthesizerAgent } from "../agents/synthesizer-agent";
import { tavilySearchTool } from "../tools/tavily-search";

/**
 * Basic Search Workflow
 *
 * Token Budget: 1K-2.5K tokens
 * Steps: search → synthesize
 * Latency: 3-5s
 *
 * This workflow provides fast, token-efficient research by:
 * 1. Performing a basic search with 5 results
 * 2. Synthesizing the results into a clear answer
 *
 * Requirements: 6.1
 */

/**
 * Step 1: Search
 * Performs a basic Tavily search with maxResults=5
 * Token estimate: 500-1000 tokens
 */
const searchStep = createStep({
  id: "search",
  description: "Perform basic web search with Tavily",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for the query"),
  }),
  outputSchema: z.object({
    answer: z.string().describe("AI-generated answer from search"),
    results: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          score: z.number(),
        })
      )
      .describe("Search results"),
    totalResults: z.number().describe("Total number of results"),
    tokenEstimate: z.number().describe("Estimated tokens used"),
  }),
  execute: async ({ inputData, runtimeContext }) => {
    const { query, jurisdiction } = inputData;

    try {
      // Execute search with maxResults=5 for token efficiency
      const searchResults = await tavilySearchTool.execute({
        context: {
          query: `${query} ${jurisdiction} law`,
          maxResults: 5,
          filterZimbabweDomains: jurisdiction.toLowerCase() === "zimbabwe",
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
      // Error handling: return partial results to allow synthesis to continue
      console.error("[Basic Search Workflow] Search step error:", error);

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
 * Uses the synthesizer agent to format results into a clear answer
 * Token estimate: 500-1500 tokens
 */
const synthesizeStep = createStep({
  id: "synthesize",
  description: "Synthesize search results into clear answer",
  inputSchema: z.object({
    answer: z.string(),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number(),
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
      // Prepare synthesis prompt
      const synthesisPrompt = `Synthesize these search results for Zimbabwe legal query: "${query}"

Search Results:
${
  results.length > 0 ? JSON.stringify(results, null, 2) : "No results available"
}

AI Answer: ${answer || "No answer generated"}

Provide a clear, comprehensive answer with proper citations and Zimbabwe legal context.`;

      // Generate synthesis with maxSteps=1
      // Note: Token limit is controlled by the agent's model configuration
      const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
        maxSteps: 1,
      });

      // Extract sources from results
      const sources = results.map((r) => ({
        title: r.title,
        url: r.url,
      }));

      // Estimate synthesis tokens (rough estimate based on response length)
      const synthesisTokens = Math.ceil(synthesized.text.length / 4);
      const totalTokens = tokenEstimate + synthesisTokens;

      return {
        response: synthesized.text,
        sources,
        totalTokens,
      };
    } catch (error) {
      // Error handling: return best available response
      console.error("[Basic Search Workflow] Synthesize step error:", error);

      // Fallback: return raw answer if synthesis fails
      const fallbackResponse =
        answer || "Unable to generate response. Please try again.";

      const sources = results.map((r) => ({
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
 * Basic Search Workflow
 *
 * Executes: search → synthesize
 * Token Budget: 1K-2.5K tokens
 * Latency Target: 3-5s
 */
export const basicSearchWorkflow = createWorkflow({
  id: "basic-search-workflow",
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
