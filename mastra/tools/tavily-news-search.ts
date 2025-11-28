import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";
import {
  type DomainStrategy,
  getExcludeDomains,
  getPriorityDomains,
} from "@/lib/utils/tavily-domain-strategy";
import { estimateTokens } from "@/lib/utils/token-estimation";
import { getDomainTier } from "@/lib/utils/zimbabwe-domains";

/**
 * Tavily News Search Tool for Mastra
 *
 * Provides time-sensitive news search using Tavily's news topic mode.
 * Optimized for recent legal developments, policy changes, and current events.
 *
 * This tool is specifically designed for queries that require current information
 * from news sources. It filters results by publication date and returns structured
 * news articles with metadata.
 *
 * Use this tool when:
 * - You need recent news or current events
 * - The query is time-sensitive (e.g., "recent changes", "latest developments")
 * - You want to track legal or policy updates
 * - You need to verify current status of ongoing matters
 *
 * @example
 * // Recent legal developments
 * tavilyNewsSearchTool.execute({
 *   query: "Zimbabwe legal reforms",
 *   days: 30
 * })
 *
 * // Breaking news
 * tavilyNewsSearchTool.execute({
 *   query: "Supreme Court ruling",
 *   days: 7
 * })
 *
 * // With jurisdiction context
 * tavilyNewsSearchTool.execute({
 *   query: "employment law changes",
 *   days: 14,
 *   jurisdiction: "Zimbabwe"
 * })
 */
export const tavilyNewsSearchTool = createTool({
  id: "tavily-news-search",
  description:
    "Search for recent news and current events using Tavily's news mode. " +
    "Returns time-filtered news articles with publication dates, titles, URLs, content, and relevance scores. " +
    "Supports date filtering from 1-30 days. " +
    "Optimized for time-sensitive queries requiring current information (2K-5K tokens). " +
    "Best for tracking recent legal developments, policy changes, and breaking news.",

  inputSchema: z.object({
    query: z
      .string()
      .min(3, "Query must be at least 3 characters")
      .max(500, "Query must not exceed 500 characters")
      .describe("The news search query"),

    days: z
      .number()
      .int()
      .min(1, "Days must be at least 1")
      .max(30, "Days must not exceed 30")
      .default(7)
      .describe(
        "Number of days back to search for news (1-30 days, default: 7)"
      ),

    jurisdiction: z
      .string()
      .optional()
      .describe(
        "Jurisdiction to add to query for location-specific news (e.g., 'Zimbabwe')"
      ),

    maxResults: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Maximum number of news results to return (default: 5)"),

    domainStrategy: z
      .enum(["strict", "prioritized", "open"])
      .optional()
      .default("prioritized")
      .describe("Domain strategy for prioritizing news sources"),
  }),

  outputSchema: z.object({
    results: z
      .array(
        z.object({
          title: z.string().describe("Article title"),
          url: z.string().describe("Article URL"),
          content: z.string().describe("Article content/summary"),
          publishedDate: z
            .string()
            .describe("Publication date (ISO 8601 format)"),
          score: z.number().describe("Relevance score (0-1)"),
          tier: z.enum(["tier1", "tier2", "tier3", "tier4", "external"]),
        })
      )
      .describe("Array of news articles with authority tier"),

    totalResults: z.number().describe("Total number of results returned"),

    tokenEstimate: z
      .number()
      .describe("Estimated number of tokens in the response (2K-5K)"),

    query: z.string().describe("The final query used for search"),

    dateRange: z.object({
      from: z.string().describe("Start date of search range (ISO 8601)"),
      to: z.string().describe("End date of search range (ISO 8601)"),
    }),
  }),

  execute: async ({ context }) => {
    const {
      query,
      days,
      jurisdiction,
      maxResults,
      domainStrategy = "prioritized",
    } = context as {
      query: string;
      days?: number;
      jurisdiction?: string;
      maxResults?: number;
      domainStrategy?: DomainStrategy;
    };

    // Validate environment
    // Get API key from load balancer (Cost: 1 credit for basic/news search)
    const apiKey = await getTavilyBalancer().getApiKey(1);

    if (!apiKey) {
      throw new Error("Failed to retrieve Tavily API key from load balancer");
    }

    // Use query directly - it's already enhanced by query-enhancer-agent
    const enhancedQuery = query;

    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (days || 7));

    // Retry logic configuration
    const MAX_RETRIES = 1;
    const RETRY_DELAY_MS = 1000;

    let lastError: Error | null = null;

    // Attempt execution with retry logic
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const requestBody: Record<string, unknown> = {
          api_key: apiKey,
          query: enhancedQuery,
          topic: "news", // Use news topic for time-sensitive queries
          days: days || 7, // Time filtering parameter
          max_results: maxResults || 5,
          include_answer: false, // We want raw news results
          include_raw_content: false, // Content summaries are sufficient
          search_depth: "basic", // Basic is sufficient for news
        };

        // Apply domain strategy
        if (domainStrategy === "strict") {
          requestBody.include_domains = getPriorityDomains("standard");
        } else if (domainStrategy === "prioritized") {
          requestBody.exclude_domains = getExcludeDomains();
          requestBody.include_domains = getPriorityDomains("standard");
        } else {
          // open
          requestBody.exclude_domains = getExcludeDomains();
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
            `Tavily API error (${response.status}): ${response.statusText}. ${errorText}`
          );
        }

        const data = await response.json();

        // Process results
        const results =
          data.results?.map((result: any) => ({
            title: result.title || "Untitled",
            url: result.url || "",
            content: result.content || "",
            publishedDate:
              result.published_date || new Date().toISOString().split("T")[0],
            score: result.score || 0,
            tier: getDomainTier(result.url),
          })) || [];

        // Estimate tokens in the response
        const responseText = JSON.stringify(results);
        const tokenEstimate = estimateTokens(responseText);

        // Log token usage for monitoring
        console.log("[Tavily News Search]", {
          query: `${enhancedQuery.substring(0, 50)}...`,
          days,
          resultsCount: results.length,
          tokenEstimate,
          withinBudget: tokenEstimate >= 2000 && tokenEstimate <= 5000,
          dateRange: {
            from: fromDate.toISOString().split("T")[0],
            to: toDate.toISOString().split("T")[0],
          },
        });

        return {
          results,
          totalResults: results.length,
          tokenEstimate,
          query: enhancedQuery,
          dateRange: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        };
      } catch (error) {
        lastError = error as Error;

        // Log the error
        console.error(`[Tavily News Search] Attempt ${attempt + 1} failed:`, {
          error: lastError.message,
          query: `${enhancedQuery.substring(0, 50)}...`,
          days,
        });

        // If this was the last attempt, throw the error
        if (attempt === MAX_RETRIES) {
          break;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    // If we get here, all retries failed
    throw new Error(
      `Tavily News Search failed after ${MAX_RETRIES + 1} attempts: ${
        lastError?.message || "Unknown error"
      }`
    );
  },
});
