import { generateText } from "ai";
import { myProvider } from "@/lib/ai/providers";

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Summarize large content to fit within context limits
 * Uses a fast model to extract key information
 */
export async function summarizeContent(
  content: string,
  maxLength = 2000,
  context?: string
): Promise<string> {
  // If content is already short enough, return as-is
  if (content.length <= maxLength) {
    return content;
  }

  console.log(
    `[Summarize] Content too long (${content.length} chars), summarizing to ~${maxLength} chars`
  );

  try {
    // Cerebras llama-3.3-70b has 128K token limit
    // Reserve tokens for: prompt (2000) + response (2000) = 4000 tokens
    // Available for content: 128K - 4K = 124K tokens ≈ 496K chars
    const maxInputChars = 400_000; // Conservative limit to stay well under token limit

    // If content is extremely long, chunk it first
    let processedContent = content;
    if (content.length > maxInputChars) {
      console.log(
        `[Summarize] Content exceeds safe limit, chunking from ${content.length} to ${maxInputChars} chars`
      );

      // Take beginning and end of content for better context
      const halfChunk = Math.floor(maxInputChars / 2);
      processedContent =
        content.substring(0, halfChunk) +
        "\n\n[... middle section omitted ...]\n\n" +
        content.substring(content.length - halfChunk);
    }

    const promptText = `Extract and summarize the key legal information from the following content. Focus on:
- Main legal principles and holdings
- Relevant case citations and statutes
- Key facts and outcomes
- Important dates and parties

${context ? `Context: ${context}\n\n` : ""}Content to summarize:
${processedContent}

Provide a concise summary (max ${Math.floor(
      maxLength / 2
    )} words) that preserves all critical legal information:`;

    const estimatedTokens = estimateTokens(promptText);
    console.log(
      `[Summarize] Estimated tokens: ${estimatedTokens} (limit: 128K)`
    );

    if (estimatedTokens > 120_000) {
      console.warn(
        `[Summarize] Still too long after chunking (${estimatedTokens} tokens), using simple truncation`
      );
      return (
        content.substring(0, maxLength) +
        "\n\n[Content truncated due to length...]"
      );
    }

    // Use a powerful model for summarization (title-model uses llama-3.3-70b with 128K context)
    const { text } = await generateText({
      model: myProvider.languageModel("title-model"),
      prompt: promptText,
    });

    console.log(
      `[Summarize] Reduced from ${content.length} to ${text.length} chars`
    );
    return text;
  } catch (error) {
    console.error("[Summarize] Failed to summarize content:", error);

    // Check if it's a context length error
    if (
      error instanceof Error &&
      (error.message.includes("context_length_exceeded") ||
        error.message.includes("reduce the length"))
    ) {
      console.log(
        "[Summarize] Context length exceeded, using simple truncation"
      );
    }

    // Fallback: simple truncation with ellipsis
    return (
      content.substring(0, maxLength) +
      "\n\n[Content truncated due to length...]"
    );
  }
}

/**
 * Intelligently chunk and summarize multiple pieces of content
 */
export async function summarizeMultipleResults(
  results: Array<{ title: string; url: string; content: string }>,
  maxTotalLength = 10_000
): Promise<string> {
  const maxPerResult = Math.floor(maxTotalLength / results.length);

  const summaries = await Promise.all(
    results.map(async (result, index) => {
      const summary = await summarizeContent(
        result.content,
        maxPerResult,
        `Source ${index + 1}: ${result.title}`
      );

      return `## Source ${index + 1}: ${result.title}
URL: ${result.url}

${summary}
`;
    })
  );

  return summaries.join("\n\n---\n\n");
}
