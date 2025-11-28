import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";
import { estimateTokens } from "@/lib/utils/token-estimation";

/**
 * Tavily Extract Tool for Mastra
 * Extracts detailed content from specific URLs
 *
 * Optimizations:
 * - Enforces max 3 URLs per request
 * - Provides token estimation per URL and total
 */
export const tavilyExtractTool = createTool({
  id: "tavily-extract",
  description:
    "Extract detailed content from specific URLs (max 3 URLs). Use this when you need full content from a webpage.",

  inputSchema: z.object({
    urls: z
      .array(z.string())
      .max(3, "Maximum 3 URLs allowed per request")
      .describe("Array of URLs to extract content from (max 3)"),
  }),

  outputSchema: z.object({
    results: z
      .array(
        z.object({
          url: z.string(),
          rawContent: z.string(),
          tokenEstimate: z.number().describe("Estimated tokens for this URL"),
        })
      )
      .describe("Extracted content from each URL with token estimates"),
    totalTokens: z.number().describe("Total estimated tokens across all URLs"),
  }),

  execute: async ({ context }) => {
    const { urls } = context;

    // Enforce max 3 URLs
    if (urls.length > 3) {
      throw new Error(
        `Too many URLs provided (${urls.length}). Maximum 3 URLs allowed per request.`
      );
    }

    // Calculate cost based on number of URLs (1 credit per 5 URLs)
    const cost = Math.max(1, Math.ceil(urls.length / 5));
    const apiKey = await getTavilyBalancer().getApiKey(cost);

    if (!apiKey) {
      throw new Error("Failed to retrieve Tavily API key from load balancer");
    }

    try {
      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          urls,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Calculate token estimates per URL and total
      let totalTokens = 0;
      const results =
        data.results?.map((result: any) => {
          const rawContent = result.raw_content || "";
          const tokenEstimate = estimateTokens(rawContent);
          totalTokens += tokenEstimate;

          return {
            url: result.url || "",
            rawContent,
            tokenEstimate,
          };
        }) || [];

      return {
        results,
        totalTokens,
      };
    } catch (error) {
      console.error("Tavily extract error:", error);
      throw error;
    }
  },
});
