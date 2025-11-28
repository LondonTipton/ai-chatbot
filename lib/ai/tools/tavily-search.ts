import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

const logger = createLogger("tools/tavily-search");

type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
};

type TavilyResponse = {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
  response_time: number;
};

type TavilySearchProps = {
  dataStream?: UIMessageStreamWriter<ChatMessage>;
};

export const tavilySearch = ({ dataStream }: TavilySearchProps = {}) =>
  tool({
    description:
      "Search the web for current legal information, case law, statutes, and regulations. ALWAYS use this tool when users ask about: specific court cases (with or without full citations), recent legal developments, current statutes or amendments, Zimbabwean legal matters, government regulations, or any legal information that requires verification. You can search with partial information (e.g., case names, parties, general topics) and refine based on results. DO NOT ask users for more details before searching - search first with available information, then ask for clarification if needed. After calling this tool, you MUST provide a comprehensive analysis of the search results.",
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
      maxResults: rawMaxResults = 5,
      includeDomains,
      excludeDomains,
    }) => {
      const toolId = generateUUID();

      // Emit tool start event
      if (dataStream) {
        dataStream.write({
          type: "data-toolStart",
          data: {
            id: toolId,
            tool: "tavilySearch",
            message: "🔍 Searching legal databases",
          },
        });
      }

      try {
        // Validate maxResults constraints (since we can't use .min/.max with Cerebras)
        const maxResults = Math.min(Math.max(rawMaxResults, 1), 10);
        
        // Get load-balanced API key
        const { getTavilyBalancer } = await import("@/lib/ai/tavily-key-balancer");
        const apiKey = await getTavilyBalancer().getApiKey(1);

        if (!apiKey) {
          throw new Error(
            "TAVILY_API_KEY is not configured. Please add it to your environment variables."
          );
        }

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
          throw new Error(
            `Tavily API error (${response.status}): ${errorText}`
          );
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

        const result = {
          query: data.query,
          answer: data.answer || "No direct answer available",
          results: formattedResults,
          totalResults: formattedResults.length,
          responseTime: data.response_time,
          searchDepth,
        };

        // Emit tool complete event
        if (dataStream) {
          dataStream.write({
            type: "data-toolComplete",
            data: { id: toolId },
          });
        }

        return result;
      } catch (error) {
        logger.error("Tavily search error:", error);

        // Provide more helpful error context
        let errorResult: any;

        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("403")) {
            errorResult = {
              query,
              answer:
                "Search failed: Invalid or missing Tavily API key. Please check your TAVILY_API_KEY environment variable.",
              results: [],
              totalResults: 0,
              responseTime: 0,
              searchDepth,
              error: "Authentication error",
            };
          } else if (error.message.includes("429")) {
            errorResult = {
              query,
              answer:
                "Search failed: Tavily API rate limit exceeded. Please try again later or upgrade your plan.",
              results: [],
              totalResults: 0,
              responseTime: 0,
              searchDepth,
              error: "Rate limit exceeded",
            };
          } else {
            errorResult = {
              query,
              answer: `Search encountered an error: ${error.message}. I'll try to help based on my training data instead.`,
              results: [],
              totalResults: 0,
              responseTime: 0,
              searchDepth,
              error: "Search failed",
            };
          }
        } else {
          errorResult = {
            query,
            answer:
              "Search encountered an unknown error. I'll try to help based on my training data instead.",
            results: [],
            totalResults: 0,
            responseTime: 0,
            searchDepth,
            error: "Search failed",
          };
        }

        // Emit tool complete event even on error
        if (dataStream) {
          dataStream.write({
            type: "data-toolComplete",
            data: { id: toolId },
          });
        }

        return errorResult;
      }
    },
  });
