import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  estimateSearchResultTokens,
  estimateTokens,
} from "@/lib/utils/token-estimation";
import { getZimbabweLegalDomains } from "@/lib/utils/zimbabwe-domains";

/**
 * Tavily Search Tool for Mastra
 * Performs web searches using the Tavily API
 * Optimized for token efficiency with Zimbabwe legal domain filtering
 */
export const tavilySearchTool = createTool({
  id: "tavily-search",
  description:
    "Search the web for current information on any topic. Returns relevant search results with sources. Optimized for token efficiency with default 3 results.",

  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .default(3)
      .describe("Maximum number of results to return (default: 3)"),
    filterZimbabweDomains: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Filter results to Zimbabwe legal domains only (gov.zw, zimlii.org, etc.)"
      ),
  }),

  outputSchema: z.object({
    answer: z.string().describe("AI-generated answer based on search results"),
    results: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
          content: z.string(),
          score: z.number(),
        })
      )
      .describe("Array of search results"),
    totalResults: z.number().describe("Total number of results found"),
    tokenEstimate: z
      .number()
      .describe("Estimated token count for the search results"),
  }),

  execute: async ({ context }) => {
    const { query, maxResults, filterZimbabweDomains } = context;

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      // Build request body with optional Zimbabwe domain filtering
      const requestBody: any = {
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      };

      // Add Zimbabwe domain filtering if requested
      if (filterZimbabweDomains) {
        requestBody.include_domains = getZimbabweLegalDomains();
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      const results =
        data.results?.map((result: any) => ({
          title: result.title || "",
          url: result.url || "",
          content: result.content || "",
          score: result.score || 0,
        })) || [];

      // Calculate token estimate for results
      const answerTokens = estimateTokens(data.answer || "");
      const resultsTokens = estimateSearchResultTokens(results);
      const tokenEstimate = answerTokens + resultsTokens;

      return {
        answer: data.answer || "No answer generated",
        results,
        totalResults: results.length,
        tokenEstimate,
      };
    } catch (error) {
      console.error("Tavily search error:", error);
      throw error;
    }
  },
});
