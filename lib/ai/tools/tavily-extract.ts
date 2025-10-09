import { tool } from "ai";
import { z } from "zod";

type TavilyExtractResult = {
  url: string;
  title?: string;
  content?: string;
  raw_content: string;
  images?: string[];
  favicon?: string;
};

type TavilyExtractResponse = {
  results: TavilyExtractResult[];
  response_time: number;
};

export const tavilyExtract = tool({
  description:
    "Extract clean, structured content from web URLs. Perfect for: extracting full text from legal documents, court cases, or rulings; getting complete article or documentation content; cleaning and formatting web content for analysis; extracting content from multiple URLs at once. Use this AFTER tavilySearch to get the full content of relevant sources. Returns the full content in markdown format, cleaned and ready for analysis or document creation.",
  inputSchema: z.object({
    urls: z
      .array(z.string().url())
      .min(1)
      .max(5)
      .describe(
        "URLs to extract content from (max 5). Use URLs from tavilySearch results to get full content of relevant sources."
      ),
    format: z
      .enum(["markdown", "text"])
      .optional()
      .default("markdown")
      .describe(
        'Output format: "markdown" for structured content (recommended for legal documents), "text" for plain text'
      ),
    extractDepth: z
      .enum(["basic", "advanced"])
      .optional()
      .default("basic")
      .describe(
        'Extraction depth: "basic" for standard content, "advanced" for complex pages with tables and embedded content'
      ),
  }),
  execute: async ({ urls, format = "markdown", extractDepth = "basic" }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error(
        "TAVILY_API_KEY is not configured. Please add it to your environment variables."
      );
    }

    try {
      const requestBody = {
        api_key: apiKey,
        urls,
        format,
        extract_depth: extractDepth,
      };

      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error (${response.status}): ${errorText}`);
      }

      const data: TavilyExtractResponse = await response.json();

      // Format results for better readability
      const formattedResults = data.results.map((result, index) => ({
        position: index + 1,
        url: result.url,
        title: result.title || "Untitled",
        content: result.raw_content,
        contentLength: result.raw_content.length,
        format,
      }));

      return {
        results: formattedResults,
        totalExtracted: formattedResults.length,
        responseTime: data.response_time,
        extractDepth,
        format,
      };
    } catch (error) {
      console.error("Tavily extract error:", error);

      // Provide helpful error context
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("403")) {
          return {
            results: [],
            totalExtracted: 0,
            responseTime: 0,
            extractDepth,
            format,
            error:
              "Authentication error: Invalid or missing Tavily API key. Please check your TAVILY_API_KEY environment variable.",
          };
        }

        if (error.message.includes("429")) {
          return {
            results: [],
            totalExtracted: 0,
            responseTime: 0,
            extractDepth,
            format,
            error:
              "Rate limit exceeded: Tavily API rate limit reached. Please try again later or upgrade your plan.",
          };
        }
      }

      // Generic error with helpful message
      return {
        results: [],
        totalExtracted: 0,
        responseTime: 0,
        extractDepth,
        format,
        error: `Extraction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
});
