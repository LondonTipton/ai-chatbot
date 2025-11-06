import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { estimateTokens } from "@/lib/utils/token-estimation";

/**
 * Tavily Context Search Tool for Mastra
 *
 * Provides token-controlled RAG (Retrieval-Augmented Generation) using Tavily's
 * get_search_context function. Returns cleaned, formatted content ready for LLM context.
 *
 * This tool is optimized for comprehensive research with strict token budget control.
 * The maxTokens parameter ensures predictable token usage, making it ideal for
 * workflows that need to stay within specific token budgets.
 *
 * Use this tool when:
 * - You need comprehensive context for deep research
 * - Token budget control is critical
 * - You want pre-formatted content ready for LLM consumption
 * - You need to aggregate information from multiple sources
 *
 * @example
 * // Basic usage with default token limit
 * tavilyContextSearchTool.execute({
 *   query: "Zimbabwe contract law requirements"
 * })
 *
 * // With custom token limit and jurisdiction
 * tavilyContextSearchTool.execute({
 *   query: "employment law regulations",
 *   maxTokens: 5000,
 *   jurisdiction: "Zimbabwe"
 * })
 *
 * // With domain filtering and time range
 * tavilyContextSearchTool.execute({
 *   query: "recent legal reforms",
 *   maxTokens: 8000,
 *   jurisdiction: "Zimbabwe",
 *   timeRange: "year",
 *   includeDomains: ["gov.zw", "zimlii.org"]
 * })
 */
export const tavilyContextSearchTool = createTool({
  id: "tavily-context-search",
  description:
    "Get comprehensive search context with strict token control using Tavily's RAG mode. " +
    "Returns cleaned, formatted content ready for LLM context. " +
    "Supports configurable token limits (2K-15K), jurisdiction filtering, time ranges, and domain filtering. " +
    "Best for deep research requiring comprehensive information within a specific token budget.",

  inputSchema: z.object({
    query: z
      .string()
      .min(3, "Query must be at least 3 characters")
      .max(500, "Query must not exceed 500 characters")
      .describe("The search query for context retrieval"),

    maxTokens: z
      .number()
      .min(2000, "maxTokens must be at least 2000")
      .max(15_000, "maxTokens must not exceed 15000")
      .default(8000)
      .describe(
        "Maximum number of tokens for the returned context (2K-15K range)"
      ),

    jurisdiction: z
      .string()
      .optional()
      .describe(
        "Jurisdiction to add to query for location-specific context (e.g., 'Zimbabwe')"
      ),

    timeRange: z
      .enum(["day", "week", "month", "year"])
      .optional()
      .describe("Time range filter for search results"),

    includeDomains: z
      .array(z.string())
      .optional()
      .describe(
        "Array of domains to prioritize in search (e.g., ['gov.zw', 'zimlii.org'])"
      ),
  }),

  outputSchema: z.object({
    context: z
      .string()
      .describe(
        "Cleaned and formatted search context ready for LLM consumption"
      ),
    tokenCount: z
      .number()
      .describe("Actual number of tokens in the returned context"),
    truncated: z
      .boolean()
      .describe(
        "Indicates if content was truncated to meet token limit (presence of [...] markers)"
      ),
    query: z.string().describe("The final query used for search"),
  }),

  execute: async ({ context }) => {
    const { query, maxTokens, jurisdiction, timeRange, includeDomains } =
      context;

    // Validate environment
    if (!process.env.TAVILY_API_KEY) {
      throw new Error(
        "TAVILY_API_KEY is not configured. Please set the environment variable."
      );
    }

    // Enhance query with jurisdiction if provided
    const enhancedQuery = jurisdiction ? `${query} ${jurisdiction} law` : query;

    // Retry logic configuration
    const MAX_RETRIES = 1;
    const RETRY_DELAY_MS = 1000;

    let lastError: Error | null = null;

    // Attempt execution with retry logic
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Build request body
        const requestBody: any = {
          api_key: process.env.TAVILY_API_KEY,
          query: enhancedQuery,
          search_depth: "advanced", // Use advanced search for better quality
          max_tokens: maxTokens,
          include_answer: false, // We want raw context, not a generated answer
          include_raw_content: true, // Get full content
        };

        // Add optional parameters if provided
        if (timeRange) {
          requestBody.time_range = timeRange;
        }

        if (includeDomains && includeDomains.length > 0) {
          requestBody.include_domains = includeDomains;
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

        // Extract context from results
        // Tavily returns results with raw_content when include_raw_content is true
        let contextString = "";

        if (data.results && data.results.length > 0) {
          // Aggregate content from all results
          contextString = data.results
            .map((result: any) => {
              const title = result.title || "";
              const content = result.raw_content || result.content || "";
              const url = result.url || "";

              return `## ${title}\nSource: ${url}\n\n${content}\n\n---\n`;
            })
            .join("\n");

          // Truncate to maxTokens if needed
          const estimatedTokens = estimateTokens(contextString);
          if (estimatedTokens > maxTokens) {
            // Rough truncation: keep approximately maxTokens * 4 characters
            const maxChars = maxTokens * 4;
            contextString =
              contextString.substring(0, maxChars) +
              "\n\n[...content truncated to meet token limit...]";
          }
        } else {
          contextString =
            "No relevant context found for this query. Please try a different search query or adjust the parameters.";
        }

        // Calculate actual token count
        const tokenCount = estimateTokens(contextString);

        // Check if content was truncated
        const truncated =
          contextString.includes("[...content truncated") ||
          contextString.includes("[...]");

        // Log token usage for monitoring
        console.log("[Tavily Context Search]", {
          query: `${enhancedQuery.substring(0, 50)}...`,
          maxTokens,
          actualTokens: tokenCount,
          truncated,
          withinBudget: tokenCount <= maxTokens,
          resultsCount: data.results?.length || 0,
        });

        return {
          context: contextString,
          tokenCount,
          truncated,
          query: enhancedQuery,
        };
      } catch (error) {
        lastError = error as Error;

        // Log the error
        console.error(
          `[Tavily Context Search] Attempt ${attempt + 1} failed:`,
          {
            error: lastError.message,
            query: `${enhancedQuery.substring(0, 50)}...`,
            maxTokens,
          }
        );

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
      `Tavily Context Search failed after ${MAX_RETRIES + 1} attempts: ${
        lastError?.message || "Unknown error"
      }`
    );
  },
});
