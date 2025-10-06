import { tool } from "ai";
import { z } from "zod";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
  response_time: number;
}

export const tavilySearch = tool({
  description:
    "Search the web for current legal information, case law, statutes, and regulations. ALWAYS use this tool when users ask about: specific court cases (with or without full citations), recent legal developments, current statutes or amendments, Zimbabwean legal matters, government regulations, or any legal information that requires verification. You can search with partial information (e.g., case names, parties, general topics) and refine based on results. DO NOT ask users for more details before searching - search first with available information, then ask for clarification if needed.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query. Can be broad or specific. Include available details like case names, parties, jurisdiction (Zimbabwe), legal topics, or statutes. Examples: 'Bowers Minister of Lands Zimbabwe', 'Zimbabwe Labour Act amendments', 'property rights constitutional court Zimbabwe'"
      ),
    searchDepth: z
      .enum(["basic", "advanced"])
      .optional()
      .default("basic")
      .describe(
        'Search depth: "basic" for quick results, "advanced" for comprehensive research'
      ),
    maxResults: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .describe("Maximum number of search results to return (1-10)"),
    includeDomains: z
      .array(z.string())
      .optional()
      .describe(
        'List of domains to specifically include in search (e.g., ["gov.zw", "zimlii.org"])'
      ),
    excludeDomains: z
      .array(z.string())
      .optional()
      .describe("List of domains to exclude from search"),
  }),
  execute: async ({
    query,
    searchDepth = "basic",
    maxResults = 5,
    includeDomains,
    excludeDomains,
  }) => {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      throw new Error(
        "TAVILY_API_KEY is not configured. Please add it to your environment variables."
      );
    }

    try {
      const requestBody: Record<string, unknown> = {
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
      };

      if (includeDomains && includeDomains.length > 0) {
        requestBody.include_domains = includeDomains;
      }

      if (excludeDomains && excludeDomains.length > 0) {
        requestBody.exclude_domains = excludeDomains;
      }

      const response = await fetch("https://api.tavily.com/search", {
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

      const data: TavilyResponse = await response.json();

      // Format results for better readability
      const formattedResults = data.results.map((result, index) => ({
        position: index + 1,
        title: result.title,
        url: result.url,
        content: result.content,
        relevanceScore: result.score,
        publishedDate: result.published_date || "Not available",
      }));

      return {
        query: data.query,
        answer: data.answer || "No direct answer available",
        results: formattedResults,
        totalResults: formattedResults.length,
        responseTime: data.response_time,
        searchDepth,
      };
    } catch (error) {
      console.error("Tavily search error:", error);

      // Provide more helpful error context
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("403")) {
          return {
            query,
            answer:
              "Search failed: Invalid or missing Tavily API key. Please check your TAVILY_API_KEY environment variable.",
            results: [],
            totalResults: 0,
            responseTime: 0,
            searchDepth,
            error: "Authentication error",
          };
        }

        if (error.message.includes("429")) {
          return {
            query,
            answer:
              "Search failed: Tavily API rate limit exceeded. Please try again later or upgrade your plan.",
            results: [],
            totalResults: 0,
            responseTime: 0,
            searchDepth,
            error: "Rate limit exceeded",
          };
        }
      }

      // Generic error with helpful message
      return {
        query,
        answer: `Search encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }. I'll try to help based on my training data instead.`,
        results: [],
        totalResults: 0,
        responseTime: 0,
        searchDepth,
        error: "Search failed",
      };
    }
  },
});
