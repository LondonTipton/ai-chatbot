import { tool } from "ai";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const logger = createLogger("tools/tavily-advanced-search");

/**
 * Tavily Advanced Search Tool
 * Deep search with comprehensive results and AI-generated answer
 * Used for light research queries
 */
export const tavilyAdvancedSearch = tool({
  description:
    "Advanced search for legal information with comprehensive results and AI-generated answer. Use for queries that need detailed information with sources.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The search query for detailed legal information"),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of results (1-10)"),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    logger.log(
      `[tavilyAdvancedSearch] 🔍 Tool execute started with query: "${query.substring(
        0,
        100
      )}..."`
    );
    logger.log(`[tavilyAdvancedSearch] 📊 maxResults: ${maxResults}`);

    try {
      const apiKey = process.env.TAVILY_API_KEY;

      if (!apiKey) {
        logger.error("[tavilyAdvancedSearch] ❌ TAVILY_API_KEY not configured");
        throw new Error(
          "TAVILY_API_KEY is not configured. Please add it to your environment variables."
        );
      }

      logger.log("[tavilyAdvancedSearch] ✅ API key found, making request...");

      // Validate maxResults
      const validMaxResults = Math.min(Math.max(maxResults, 1), 10);

      const requestBody = {
        api_key: apiKey,
        query,
        search_depth: "advanced", // Advanced search for comprehensive results
        include_answer: true, // Include AI-generated answer
        include_raw_content: false,
        max_results: validMaxResults,
      };

      logger.log(
        `[tavilyAdvancedSearch] 📤 Request: ${JSON.stringify({
          ...requestBody,
          api_key: "***",
        })}`
      );

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      logger.log(
        `[tavilyAdvancedSearch] 📥 Response status: ${response.status}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `[tavilyAdvancedSearch] ❌ API error: ${response.status} - ${errorText}`
        );
        throw new Error(`Tavily API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      logger.log(
        `[tavilyAdvancedSearch] ✅ Got ${data.results?.length || 0} results`
      );

      // Format results
      const formattedResults =
        data.results?.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title,
          url: result.url,
          content: result.content,
          relevanceScore: result.score,
          publishedDate: result.published_date || "Not available",
        })) || [];

      const finalResult = {
        query: data.query,
        answer: data.answer || "No comprehensive answer available",
        results: formattedResults,
        totalResults: formattedResults.length,
        searchDepth: "advanced",
      };

      logger.log(
        `[tavilyAdvancedSearch] ✅ Returning result with ${formattedResults.length} formatted results`
      );

      return finalResult;
    } catch (error) {
      logger.error("[tavilyAdvancedSearch] ❌ Error in execute:", error);

      const errorResult = {
        query,
        answer: `Search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        results: [],
        totalResults: 0,
        searchDepth: "advanced",
        error: true,
      };

      logger.log("[tavilyAdvancedSearch] 📤 Returning error result");

      return errorResult;
    }
  },
});
