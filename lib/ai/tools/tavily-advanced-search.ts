import { tool } from "ai";
import { z } from "zod";

/**
 * Tavily Advanced Search Tool
 * Deep search with comprehensive results and AI-generated answer
 * Used for light research queries
 */
export const tavilyAdvancedSearch = tool({
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
  execute: async ({ query, maxResults = 5 }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;

      if (!apiKey) {
        throw new Error(
          "TAVILY_API_KEY is not configured. Please add it to your environment variables."
        );
      }

      // Validate maxResults
      const validMaxResults = Math.min(Math.max(maxResults, 1), 10);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "advanced", // Advanced search for comprehensive results
          include_answer: true, // Include AI-generated answer
          include_raw_content: false,
          max_results: validMaxResults,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Format results
      const formattedResults =
        data.results?.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title,
          url: result.url,
          content: result.content,
          relevanceScore: result.score,
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

      return {
        query,
        answer: `Search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        results: [],
        totalResults: 0,
        searchDepth: "advanced",
        error: true,
      };
    }
  },
});
