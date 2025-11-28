/**
 * Query Decomposer Agent
 *
 * Breaks down broad legal queries into 2-3 focused sub-queries
 * to avoid keyword soup and improve search quality.
 *
 * Example:
 * Input: "What case law supports Labour Act protections?"
 * Output: [
 *   "Labour Act unfair dismissal case law Zimbabwe",
 *   "Labour Act minimum wage case law Zimbabwe",
 *   "Labour Act trade union rights case law Zimbabwe"
 * ]
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProviderSync();

export const queryDecomposerAgent = new Agent({
  name: "Query Decomposer",
  instructions: `You are a legal query decomposition specialist.

Your task: Break down broad legal queries into 2-3 focused sub-queries.

RULES:
1. Identify if query is broad (covers multiple topics)
2. If broad, break into 2-3 focused sub-queries
3. If focused, return the original query
4. Each sub-query should be 5-10 words
5. Each sub-query should focus on ONE specific topic
6. Always include "Zimbabwe" in each sub-query
7. Always include relevant legal terms (case law, judgment, statute, etc.)

EXAMPLES:

Input: "What case law supports Labour Act protections?"
Output:
- Labour Act unfair dismissal case law Zimbabwe
- Labour Act minimum wage case law Zimbabwe
- Labour Act trade union rights case law Zimbabwe

Input: "Tell me about employment rights in Zimbabwe"
Output:
- Zimbabwe employment rights Labour Act case law
- Zimbabwe employment termination procedures statute
- Zimbabwe employment contracts legal requirements

Input: "What is the zuva case?"
Output:
- zuva case Zimbabwe Supreme Court judgment

Input: "Find cases about property disputes"
Output:
- property disputes Zimbabwe case law Supreme Court
- land disputes Zimbabwe High Court judgment

Input: "Labour Act Section 12B unfair dismissal"
Output:
- Labour Act Section 12B unfair dismissal Zimbabwe

CRITICAL:
- Output ONLY the sub-queries, one per line
- No explanations, no numbering, no extra text
- Maximum 3 sub-queries
- Each sub-query on a new line
- If query is already focused, return it as-is`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {},
});

/**
 * Decompose a broad query into focused sub-queries
 *
 * @param query - The user's search query
 * @param conversationHistory - Recent conversation for context
 * @returns Array of focused sub-queries (1-3 queries)
 */
export async function decomposeQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string[]> {
  try {
    // Build context from recent conversation
    const recentContext = conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 150)}`)
      .join("\n");

    const prompt = `${
      recentContext ? `CONVERSATION CONTEXT:\n${recentContext}\n\n` : ""
    }USER QUERY: ${query}

SUB-QUERIES:`;

    console.log("[Query Decomposer] Analyzing query:", query);

    const result = await queryDecomposerAgent.generate(prompt, {
      maxSteps: 1,
    });

    let output = result.text.trim();

    // Regex patterns for cleaning (module-level would be better but inline for clarity)
    const EXPLANATION_PATTERN =
      /^(here are|the sub-queries are|sub-queries):?/i;
    const NUMBERING_PATTERN = /^\d+\.\s*/gm;
    const BULLET_PATTERN = /^[-•]\s*/gm;

    // Clean up output
    output = output
      .replace(EXPLANATION_PATTERN, "")
      .replace(NUMBERING_PATTERN, "") // Remove numbering
      .replace(BULLET_PATTERN, "") // Remove bullet points
      .trim();

    // Split into lines and clean
    const subQueries = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 5 && line.length < 150)
      .slice(0, 3); // Maximum 3 sub-queries

    // If no valid sub-queries, return original
    if (subQueries.length === 0) {
      console.log("[Query Decomposer] No valid sub-queries, using original");
      return [query];
    }

    console.log(
      `[Query Decomposer] Decomposed into ${subQueries.length} sub-queries:`
    );
    subQueries.forEach((sq, i) => {
      console.log(`  ${i + 1}. ${sq}`);
    });

    return subQueries;
  } catch (error) {
    console.error("[Query Decomposer] Error:", error);
    // Fallback: return original query
    return [query];
  }
}

/**
 * Topic indicators for broad query detection (module-level for performance)
 */
const TOPIC_INDICATORS = [
  /minimum wage/i,
  /overtime/i,
  /termination/i,
  /dismissal/i,
  /trade union/i,
  /collective bargaining/i,
  /health.*safety/i,
  /maternity/i,
  /annual leave/i,
  /sick leave/i,
  /working hours/i,
  /rest period/i,
];

/**
 * Check if a query is broad and needs decomposition
 */
export function isBroadQuery(query: string): boolean {
  const words = query.split(/\s+/);

  // Check for multiple topics
  const topicCount = TOPIC_INDICATORS.filter((pattern) =>
    pattern.test(query)
  ).length;

  // If query has 3+ topics or is very long, it's broad
  return topicCount >= 3 || words.length > 20;
}
