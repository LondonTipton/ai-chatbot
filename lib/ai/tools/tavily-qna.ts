import { tool } from "ai";
import { z } from "zod";

/**
 * Tavily QNA Search Tool
 * Quick question-answering with direct answers
 * Used for simple queries that need fast, concise responses
 */
export const tavilyQna = tool({
  description:
    "Quick question-answering search for simple legal queries. Returns a direct, concise answer without detailed sources. Use this for straightforward questions that need fast responses.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The question to answer (e.g., 'What is contract law?')"),
  }),
  execute: async ({ query }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;

      if (!apiKey) {
        throw new Error(
          "TAVILY_API_KEY is not configured. Please add it to your environment variables."
        );
      }

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
          max_results: 3, // Minimal results for QNA
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return {
        query,
        answer: data.answer || "No answer available",
        sources:
          data.results?.slice(0, 3).map((r: any) => ({
            title: r.title,
            url: r.url,
          })) || [],
      };
    } catch (error) {
      console.error("Tavily QNA error:", error);

      return {
        query,
        answer: `Unable to search at this time: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        sources: [],
      };
    }
  },
});
