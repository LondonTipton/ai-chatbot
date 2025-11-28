import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";

/**
 * Tavily Advanced Search Tool - SIMPLIFIED to match MCP
 * Advanced web search using Tavily API with minimal configuration
 */
export const tavilySearchAdvancedTool = createTool({
  id: "tavily-search-advanced",
  description:
    "Advanced search for detailed information with comprehensive results.",

  inputSchema: z.object({
    query: z.string().describe("The search query for detailed information"),
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of results (1-20, default: 10)"),
    jurisdiction: z
      .string()
      .optional()
      .default("Zimbabwe")
      .describe("Legal jurisdiction for context (not used in search)"),
    includeRawContent: z
      .boolean()
      .optional()
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
      maxResults = 10,
      includeRawContent = false,
    } = context as {
      query: string;
      maxResults?: number;
      includeRawContent?: boolean;
    };

    // Get API key from load balancer (Cost: 2 credits for advanced search)
    const apiKey = await getTavilyBalancer().getApiKey(2);
    
    if (!apiKey) {
      throw new Error("Failed to retrieve Tavily API key from load balancer");
    }

    try {
      // Validate maxResults
      const validMaxResults = Math.min(Math.max(maxResults, 1), 20);

      // MINIMAL CONFIGURATION - Exactly like MCP but with advanced depth
      const requestBody = {
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: validMaxResults,
        include_raw_content: includeRawContent,
      };

      console.log("[Tavily Advanced] Query:", query);
      console.log("[Tavily Advanced] Max results:", validMaxResults);
      console.log("[Tavily Advanced] Include raw content:", includeRawContent);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[Tavily Advanced] API error:",
          response.status,
          errorText
        );
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

      console.log("[Tavily Advanced] Results found:", formattedResults.length);
      if (formattedResults.length > 0) {
        console.log(
          "[Tavily Advanced] First result:",
          formattedResults[0].title
        );
      }

      // Simple token estimate
      const tokenEstimate = Math.ceil(
        (JSON.stringify(formattedResults).length + (data.answer?.length || 0)) /
          4
      );

      return {
        query: data.query || query,
        answer: data.answer || "",
        results: formattedResults,
        totalResults: formattedResults.length,
        searchDepth: "advanced",
        tokenEstimate,
      };
    } catch (error) {
      console.error("[Tavily Advanced] Error:", error);
      throw error;
    }
  },
});
