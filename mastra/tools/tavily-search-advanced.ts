import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tavily Advanced Search Tool for Mastra
 * Deep search with comprehensive results and AI-generated answer
 */
export const tavilySearchAdvancedTool = createTool({
  id: "tavily-search-advanced",
  description:
    "Advanced search for legal information with comprehensive results and AI-generated answer. Use for queries that need detailed information with sources.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query for detailed legal information"),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results (1-10)"),
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
  }),

  execute: async ({ context }) => {
    const { query, maxResults = 5 } = context;

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      // Validate maxResults
      const validMaxResults = Math.min(Math.max(maxResults, 1), 10);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "advanced",
          include_answer: true,
          include_raw_content: false,
          max_results: validMaxResults,
        }),
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

      return {
        query: data.query,
        answer: data.answer || "No comprehensive answer available",
        results: formattedResults,
        totalResults: formattedResults.length,
        searchDepth: "advanced",
      };
    } catch (error) {
      console.error("Tavily advanced search error:", error);
      throw error;
    }
  },
});
