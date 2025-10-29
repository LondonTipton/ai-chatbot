import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tavily Advanced Search Tool for Mastra Agents
 * Performs deep searches with comprehensive results
 */
export const tavilySearchAdvancedTool = createTool({
  id: "tavily-search-advanced",
  description:
    "Perform advanced web search for legal information. Returns comprehensive results with AI-generated answer. Use for detailed research queries.",

  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results to return (1-10)"),
  }),

  outputSchema: z.object({
    query: z.string(),
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
    totalResults: z.number(),
  }),

  execute: async ({ context }) => {
    const { query, maxResults = 5 } = context;

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
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
          max_results: Math.min(Math.max(maxResults, 1), 10),
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        query: data.query || query,
        answer: data.answer || "No answer generated",
        results:
          data.results?.map((result: any) => ({
            title: result.title || "",
            url: result.url || "",
            content: result.content || "",
            score: result.score || 0,
          })) || [],
        totalResults: data.results?.length || 0,
      };
    } catch (error) {
      console.error("Tavily advanced search error:", error);
      throw error;
    }
  },
});
