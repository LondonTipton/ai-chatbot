import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";
import { estimateTokens } from "@/lib/utils/token-estimation";

/**
 * Tavily QnA Direct Tool for Mastra
 *
 * Provides quick, concise answers to factual questions using Tavily's qna_search function.
 * Optimized for token efficiency with 200-500 token responses.
 *
 * Use this tool when:
 * - You need a quick factual answer
 * - The question is straightforward and doesn't require deep research
 * - Token efficiency is important
 *
 * @example
 * // Simple factual question
 * tavilyQnaDirectTool.execute({ query: "What is the legal drinking age in Zimbabwe?" })
 *
 * // Legal definition
 * tavilyQnaDirectTool.execute({ query: "What is a contract in Zimbabwe law?" })
 */
export const tavilyQnaDirectTool = createTool({
  id: "tavily-qna-direct",
  description:
    "Quick question-answering tool that returns concise, direct answers to factual questions. " +
    "Returns only the answer string without detailed sources. " +
    "Optimized for speed and token efficiency (200-500 tokens). " +
    "Best for simple factual questions that don't require deep research.",

  inputSchema: z.object({
    query: z
      .string()
      .min(3, "Query must be at least 3 characters")
      .max(500, "Query must not exceed 500 characters")
      .describe(
        "The question to answer. Should be a clear, specific question."
      ),
  }),

  outputSchema: z.object({
    answer: z
      .string()
      .describe("Direct, concise answer to the question (200-500 tokens)"),
    tokenEstimate: z
      .number()
      .describe("Estimated number of tokens in the response"),
  }),

  execute: async ({ context }) => {
    const { query } = context;

    // Validate environment
    // Get API key from load balancer (Cost: 1 credit for basic QnA)
    const apiKey = await getTavilyBalancer().getApiKey(1);

    if (!apiKey) {
      throw new Error("Failed to retrieve Tavily API key from load balancer");
    }

    // Retry logic configuration
    const MAX_RETRIES = 1;
    const RETRY_DELAY_MS = 1000;

    let lastError: Error | null = null;

    // Attempt execution with retry logic
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "basic",
            include_answer: true,
            include_raw_content: false,
            max_results: 1, // Minimal results for token efficiency
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Tavily API error (${response.status}): ${response.statusText}. ${errorText}`
          );
        }

        const data = await response.json();

        // Extract answer
        const answer = data.answer || "No answer available for this query.";

        // Estimate tokens in the response
        const tokenEstimate = estimateTokens(answer);

        // Log token usage for monitoring
        console.log("[Tavily QnA Direct]", {
          query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
          tokenEstimate,
          withinBudget: tokenEstimate >= 200 && tokenEstimate <= 500,
        });

        return {
          answer,
          tokenEstimate,
        };
      } catch (error) {
        lastError = error as Error;

        // Log the error
        console.error(`[Tavily QnA Direct] Attempt ${attempt + 1} failed:`, {
          error: lastError.message,
          query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
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
      `Tavily QnA Direct failed after ${MAX_RETRIES + 1} attempts: ${
        lastError?.message || "Unknown error"
      }`
    );
  },
});
