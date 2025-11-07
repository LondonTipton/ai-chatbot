/**
 * Query Enhancer Agent
 *
 * Uses LLM to intelligently enhance search queries for better Tavily results.
 * Particularly important for legal case queries and context-dependent searches.
 *
 * Token budget: 50-100 tokens per enhancement
 * Latency: ~200-500ms with Llama 3.3 70B
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProvider();

export const queryEnhancerAgent = new Agent({
  name: "Query Enhancer",
  instructions: `You are a search query enhancement specialist for Zimbabwe legal research.

Your task: Transform user queries into optimal search queries for legal databases.

RULES:
1. Keep it concise - add 3-7 relevant keywords maximum
2. For legal cases: Add "Supreme Court", "case law", "judgment", "legal case"
3. For statutes: Add "legislation", "statute", "law"
4. For general queries: Add "Zimbabwe" and relevant legal domain
5. Use conversation context to understand what user is really asking
6. If user mentions a case name, preserve it exactly
7. Always include "Zimbabwe" unless already present

EXAMPLES:

Input: "What about the zuva case?"
Context: Previous question was about Labour Act
Output: zuva case Zimbabwe Supreme Court employment labour judgment

Input: "Don Nyamande v Zuva Petroleum"
Context: None
Output: Don Nyamande v Zuva Petroleum Zimbabwe Supreme Court case law judgment

Input: "Section 12B"
Context: Discussing Labour Act
Output: Section 12B Labour Act Zimbabwe legislation statute

Input: "How to register a company?"
Context: None
Output: company registration Zimbabwe incorporation business law

Input: "What did the court say?"
Context: Previous question about Zuva case
Output: Zuva Petroleum Nyamande Zimbabwe Supreme Court judgment ruling

Input: "SC 43/15"
Context: None
Output: SC 43/15 Zimbabwe Supreme Court case law judgment

Input: "landmark cases"
Context: Discussing Labour Act
Output: landmark cases Labour Act Zimbabwe Supreme Court employment

CRITICAL: 
- Output ONLY the enhanced query
- No explanations, no quotes, no extra text
- Maximum 15 words in output
- Preserve exact case names and citations from input`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {},
});

/**
 * Enhance a search query using conversation context
 */
export async function enhanceSearchQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  try {
    // Build context from recent conversation (last 3 messages)
    const recentContext = conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}`) // Limit content length
      .join("\n");

    const prompt = `${
      recentContext ? `CONVERSATION CONTEXT:\n${recentContext}\n\n` : ""
    }USER QUERY: ${query}

ENHANCED QUERY:`;

    const result = await queryEnhancerAgent.generate(prompt, {
      maxSteps: 1,
    });

    const enhanced = result.text.trim();

    // Validation: ensure output is reasonable
    if (enhanced.length > 200 || enhanced.length < query.length) {
      console.warn(
        "[Query Enhancer] Invalid output, using fallback enhancement"
      );
      return `${query} Zimbabwe`;
    }

    console.log(`[Query Enhancer] Original: "${query}"`);
    console.log(`[Query Enhancer] Enhanced: "${enhanced}"`);

    return enhanced;
  } catch (error) {
    console.error("[Query Enhancer] Error:", error);
    // Fallback: just add Zimbabwe
    return `${query} Zimbabwe`;
  }
}
