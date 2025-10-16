import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tavily Search Tool for Mastra
 * Performs web searches using the Tavily API
 */
export const tavilySearchTool = createTool({
  id: "tavily-search",
  description:
    "Search the web for current information on any topic. Returns relevant search results with sources.",

  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results to return"),
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
  }),

  execute: async ({ context }) => {
    const { query, maxResults } = context;

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
          max_results: maxResults,
          include_answer: true,
          include_raw_content: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
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
      console.error("Tavily search error:", error);
      throw error;
    }
  },
});
