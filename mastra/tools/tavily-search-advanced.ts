import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  estimateSearchResultTokens,
  estimateTokens,
} from "@/lib/utils/token-estimation";
import { getZimbabweLegalDomains } from "@/lib/utils/zimbabwe-domains";

/**
 * Tavily Advanced Search Tool for Mastra
 * Deep search with comprehensive results and AI-generated answer
 * Optimized for token efficiency with Zimbabwe legal domain filtering
 */
export const tavilySearchAdvancedTool = createTool({
  id: "tavily-search-advanced",
  description:
    "Advanced search for legal information with comprehensive results and AI-generated answer. Use for queries that need detailed information with sources. Optimized for token efficiency with default 7 results.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query for detailed legal information"),
    maxResults: z
      .number()
      .optional()
      .default(7)
      .describe("Maximum number of results (1-10, default: 7)"),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe(
        "List of domains to include in search (e.g., ['gov.zw', 'zimlii.org'])"
      ),
    country: z
      .string()
      .optional()
      .describe("Country code to boost results from (e.g., 'ZW' for Zimbabwe)"),
    timeRange: z
      .enum(["day", "week", "month", "year"])
      .optional()
      .describe("Time range for search results (day, week, month, year)"),
    jurisdiction: z
      .string()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for domain filtering (default: Zimbabwe)"),
    includeRawContent: z
      .boolean()
      .default(false)
      .describe("Whether to include raw content in search results"),
  }),

  outputSchema: z.object({
    query: z.string(),
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
    searchDepth: z.string(),
    tokenEstimate: z
      .number()
      .describe("Estimated token count for the search results"),
  }),

  execute: async ({ context }) => {
    const {
      query,
      maxResults = 7,
      includeDomains,
      country,
      timeRange,
      jurisdiction = "Zimbabwe",
      includeRawContent = false,
    } = context;

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      // Validate maxResults
      const validMaxResults = Math.min(Math.max(maxResults, 1), 10);

      // Build request body
      const requestBody: any = {
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: includeRawContent,
        max_results: validMaxResults,
      };

      // Set Zimbabwe domains as default when jurisdiction is Zimbabwe
      if (jurisdiction.toLowerCase() === "zimbabwe" && !includeDomains) {
        requestBody.include_domains = getZimbabweLegalDomains();
      } else if (includeDomains && includeDomains.length > 0) {
        requestBody.include_domains = includeDomains;
      }

      // Add country parameter if provided
      if (country) {
        requestBody.country = country;
      }

      // Add time range parameter if provided
      if (timeRange) {
        requestBody.time_range = timeRange;
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

      const formattedResults =
        data.results?.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title || "",
          url: result.url || "",
          content: result.content || "",
          relevanceScore: result.score || 0,
          publishedDate: result.published_date || "Not available",
        })) || [];

      // Calculate token estimate for results
      const answerTokens = estimateTokens(data.answer || "");
      const resultsTokens = estimateSearchResultTokens(formattedResults);
      const tokenEstimate = answerTokens + resultsTokens;

      return {
        query: data.query,
        answer: data.answer || "No comprehensive answer available",
        results: formattedResults,
        totalResults: formattedResults.length,
        searchDepth: "advanced",
        tokenEstimate,
      };
    } catch (error) {
      console.error("Tavily advanced search error:", error);
      throw error;
    }
  },
});
