import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Summarize Content Tool for Mastra
 * Summarizes large content to extract key information
 */
export const summarizeContentTool = createTool({
  id: "summarize-content",
  description:
    "Summarize large content to extract key legal information. Useful for condensing lengthy documents, case law, or research results.",

  inputSchema: z.object({
    content: z.string().describe("The content to summarize"),
    maxLength: z
      .number()
      .optional()
      .default(2000)
      .describe("Maximum length of summary in characters"),
  }),

  outputSchema: z.object({
    summary: z.string().describe("The summarized content"),
    originalLength: z.number(),
    summaryLength: z.number(),
    compressionRatio: z.number(),
  }),

  execute: async ({ context }) => {
    const { content, maxLength = 2000 } = context;

    console.log(
      `[Mastra Tool] Summarizing content: ${content.length} chars -> ~${maxLength} chars`
    );

    // If content is already short enough, return as-is
    if (content.length <= maxLength) {
      return {
        summary: content,
        originalLength: content.length,
        summaryLength: content.length,
        compressionRatio: 1.0,
      };
    }

    try {
      // Simple extractive summarization
      const sentenceRegex = /[.!?]+/;
      const sentences = content
        .split(sentenceRegex)
        .filter((s) => s.trim().length > 0);

      // Calculate how many sentences we can fit
      let summary = "";

      for (const sentence of sentences) {
        const testSummary = `${summary}${sentence.trim()}. `;
        if (testSummary.length > maxLength) {
          break;
        }
        summary = testSummary;
      }

      // If we couldn't fit any sentences, just truncate
      if (summary.length === 0) {
        summary = `${content.substring(0, maxLength)}...`;
      }

      const compressionRatio = summary.length / content.length;

      console.log(
        `[Mastra Tool] Summarized: ${content.length} -> ${
          summary.length
        } chars (${(compressionRatio * 100).toFixed(1)}%)`
      );

      return {
        summary,
        originalLength: content.length,
        summaryLength: summary.length,
        compressionRatio,
      };
    } catch (error) {
      console.error("[Mastra Tool] Summarization error:", error);

      // Fallback: simple truncation
      const summary = `${content.substring(0, maxLength)}...`;
      return {
        summary,
        originalLength: content.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / content.length,
      };
    }
  },
});
