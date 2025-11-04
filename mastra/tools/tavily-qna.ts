import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Tavily QNA Tool for Mastra
 * Quick question-answering with direct answers
 */
export const tavilyQnaTool = createTool({
  id: "tavily-qna",
  description:
    "Quick question-answering search for simple legal queries. Returns a direct, concise answer without detailed sources. Use this for straightforward questions that need fast responses.",

  inputSchema: z.object({
    query: z
      .string()
      .describe("The question to answer (e.g., 'What is contract law?')"),
  }),

  outputSchema: z.object({
    query: z.string(),
    answer: z.string().describe("Direct answer to the question"),
    sources: z
      .array(
        z.object({
          title: z.string(),
          url: z.string(),
        })
      )
      .describe("Brief list of sources"),
  }),

  execute: async ({ context }) => {
    const { query } = context;

    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "basic",
          include_answer: true,
          include_raw_content: false,
          max_results: 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        query,
        answer: data.answer || "No answer available",
        sources:
          data.results?.slice(0, 3).map((r: any) => ({
            title: r.title || "",
            url: r.url || "",
          })) || [],
      };
    } catch (error) {
      console.error("Tavily QNA error:", error);
      throw error;
    }
  },
});
