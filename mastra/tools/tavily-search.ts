import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";

/**
 * Tavily Search Tool - SIMPLIFIED to match MCP
 * Basic web search using Tavily API with minimal configuration
 */
export const tavilySearchTool = createTool({
  id: "tavily-search",
  description:
    "Search the web for current information. Returns relevant search results.",

  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of results to return (default: 10)"),
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
    const { query, maxResults = 10 } = context as {
      query: string;
      maxResults?: number;
    };

    // Get API key from load balancer (Cost: 1 credit for basic search)
    const apiKey = await getTavilyBalancer().getApiKey(1);
    
    if (!apiKey) {
      throw new Error("Failed to retrieve Tavily API key from load balancer");
    }

    try {
      // MINIMAL CONFIGURATION - Exactly like MCP
      const requestBody = {
        api_key: apiKey,
        query,
        max_results: maxResults,
      };

      console.log("[Tavily Search] ==========================================");
      console.log("[Tavily Search] Query:", query);
      console.log("[Tavily Search] Max results:", maxResults);
      console.log(
        "[Tavily Search] Request body:",
        JSON.stringify(requestBody, null, 2)
      );

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Tavily Search] API error:", response.status, errorText);
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

      console.log("[Tavily Search] Results found:", results.length);
      console.log(
        "[Tavily Search] Answer:",
        data.answer?.substring(0, 200) || "No answer"
      );

      if (results.length > 0) {
        console.log("[Tavily Search] Top 3 results:");
        results.slice(0, 3).forEach((r: any, i: number) => {
          console.log(`  ${i + 1}. ${r.title}`);
          console.log(`     URL: ${r.url}`);
          console.log(`     Score: ${r.score}`);
          console.log(`     Content: ${r.content.substring(0, 150)}...`);
        });
      } else {
        console.log("[Tavily Search] ❌ NO RESULTS FOUND FOR QUERY:", query);
      }
      console.log("[Tavily Search] ==========================================");

      // Simple token estimate
      const tokenEstimate = Math.ceil(
        (JSON.stringify(results).length + (data.answer?.length || 0)) / 4
      );

      return {
        answer: data.answer || "",
        results,
        totalResults: results.length,
        tokenEstimate,
      };
    } catch (error) {
      console.error("[Tavily Search] Error:", error);
      throw error;
    }
  },
});
