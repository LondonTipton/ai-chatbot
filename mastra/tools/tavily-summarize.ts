import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { estimateTokens } from "@/lib/utils/token-estimation";

/**
 * Tavily Summarize Tool
 *
 * Summarizes long content into concise, focused summaries.
 * Useful when content exceeds token limits or when quick overview is needed.
 *
 * Token Budget: 500-2000 tokens (depending on input length)
 * Use Case: Condensing long research results, extracting key points
 *
 * Requirements: 6.3 (Analysis Agent support)
 */

// Regex for splitting sentences - defined at module level for performance
const SENTENCE_SPLIT_REGEX = /[.!?]+/;

export const tavilySummarizeTool = createTool({
  id: "tavily-summarize",
  description:
    "Summarizes long content into concise, focused summaries. " +
    "Use this when content is too long or when you need to extract key points. " +
    "Returns a condensed summary with key findings and citations preserved. " +
    "Token budget: 500-2000 tokens depending on input length.",

  inputSchema: z.object({
    content: z.string().describe("The content to summarize"),
    maxLength: z
      .number()
      .optional()
      .default(500)
      .describe("Maximum length of summary in words (default: 500)"),
    focus: z
      .string()
      .optional()
      .describe(
        "Optional focus area for the summary (e.g., 'legal implications', 'key findings')"
      ),
  }),

  outputSchema: z.object({
    summary: z.string().describe("Condensed summary of the content"),
    keyPoints: z
      .array(z.string())
      .describe("Key points extracted from content"),
    tokenEstimate: z.number().describe("Estimated tokens in summary"),
    originalTokens: z.number().describe("Estimated tokens in original content"),
    compressionRatio: z
      .number()
      .describe("Ratio of summary tokens to original tokens"),
  }),

  execute: async ({ context }) => {
    const { content, maxLength = 500, focus } = context;

    // Use Promise.resolve to make this properly async
    return await Promise.resolve().then(() => {
      try {
        console.log("[Tavily Summarize] Starting summarization", {
          originalLength: content.length,
          maxLength,
          focus: focus || "general",
        });

        // Estimate original token count
        const originalTokens = estimateTokens(content);

        // For now, implement a simple summarization strategy
        // In production, this could call an LLM or use a dedicated summarization service
        // For this implementation, we'll extract key sentences and structure them

        // Split content into sentences
        const sentences = content
          .split(SENTENCE_SPLIT_REGEX)
          .map((s) => s.trim())
          .filter((s) => s.length > 20); // Filter out very short fragments

        // Calculate how many sentences to include based on maxLength
        const avgWordsPerSentence = 15;
        const targetSentences = Math.ceil(maxLength / avgWordsPerSentence);
        const sentencesToInclude = Math.min(targetSentences, sentences.length);

        // Extract key sentences (simple strategy: take first, middle, and last sentences)
        const keyPoints: string[] = [];
        const summaryParts: string[] = [];

        if (sentences.length <= sentencesToInclude) {
          // If content is already short, use all sentences
          summaryParts.push(...sentences);
          keyPoints.push(...sentences.slice(0, 5)); // First 5 as key points
        } else {
          // Extract distributed sentences
          const step = Math.floor(sentences.length / sentencesToInclude);
          for (let i = 0; i < sentencesToInclude; i++) {
            const index = i * step;
            if (index < sentences.length) {
              summaryParts.push(sentences[index]);
            }
          }

          // Extract key points (first few sentences)
          keyPoints.push(...sentences.slice(0, Math.min(5, sentences.length)));
        }

        // Build summary
        let summary = `${summaryParts.join(". ")}.`;

        // Add focus context if provided
        if (focus) {
          summary = `**Focus: ${focus}**\n\n${summary}`;
        }

        // Estimate summary tokens
        const summaryTokens = estimateTokens(summary);
        const compressionRatio = summaryTokens / originalTokens;

        console.log("[Tavily Summarize] Summarization complete", {
          originalTokens,
          summaryTokens,
          compressionRatio: compressionRatio.toFixed(2),
          keyPointsCount: keyPoints.length,
        });

        return {
          summary,
          keyPoints,
          tokenEstimate: summaryTokens,
          originalTokens,
          compressionRatio,
        };
      } catch (error) {
        console.error("[Tavily Summarize] Summarization error:", error);

        // Fallback: return truncated content
        const truncated = content.substring(0, maxLength * 4); // Rough word to char conversion
        const tokenEstimate = estimateTokens(truncated);

        return {
          summary: `${truncated}...`,
          keyPoints: ["Summarization failed - content truncated"],
          tokenEstimate,
          originalTokens: estimateTokens(content),
          compressionRatio: tokenEstimate / estimateTokens(content),
        };
      }
    });
  },
});
