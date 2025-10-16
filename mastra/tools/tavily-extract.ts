import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tavily Extract Tool for Mastra
 * Extracts detailed content from specific URLs
 */
export const tavilyExtractTool = createTool({
  id: "tavily-extract",
  description:
    "Extract detailed content from specific URLs. Use this when you need full content from a webpage.",

  inputSchema: z.object({
    urls: z.array(z.string()).describe("Array of URLs to extract content from"),
  }),

  outputSchema: z.object({
    results: z
      .array(
        z.object({
          url: z.string(),
          rawContent: z.string(),
        })
      )
      .describe("Extracted content from each URL"),
  }),

  execute: async ({ context }) => {
    const { urls } = context;

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          urls,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        results:
          data.results?.map((result: any) => ({
            url: result.url || "",
            rawContent: result.raw_content || "",
          })) || [],
      };
    } catch (error) {
      console.error("Tavily extract error:", error);
      throw error;
    }
  },
});
