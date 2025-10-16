import { generateText } from "ai";
import { myProvider } from "@/lib/ai/providers";

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
    // Use a fast, cheap model for summarization (title-model uses llama3.1-8b)
    const { text } = await generateText({
      model: myProvider.languageModel("title-model"),
      prompt: `Extract and summarize the key legal information from the following content. Focus on:
- Main legal principles and holdings
- Relevant case citations and statutes
- Key facts and outcomes
- Important dates and parties

${context ? `Context: ${context}\n\n` : ""}Content to summarize:
${content.substring(0, 50_000)}

Provide a concise summary (max ${Math.floor(
        maxLength / 2
      )} words) that preserves all critical legal information:`,
    });

    console.log(
      `[Summarize] Reduced from ${content.length} to ${text.length} chars`
    );
    return text;
  } catch (error) {
    console.error("[Summarize] Failed to summarize content:", error);
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
