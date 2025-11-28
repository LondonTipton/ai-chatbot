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
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProviderSync();

export const queryEnhancerAgent = new Agent({
  name: "Query Enhancer",
  instructions: `You are a search query enhancement specialist for Zimbabwe legal research.

Your task: Transform user queries into multiple semantic variations and a hypothetical answer (HyDE) to maximize retrieval from vector databases.

OUTPUT FORMAT:
You must return a valid JSON object with the following structure:
{
  "variations": ["string", "string", "string"],
  "hydePassage": "string"
}

RULES:
1. "variations": Generate 3 distinct search queries:
   - Variation 1: Natural language question (e.g., "What are the grounds for unfair dismissal?")
   - Variation 2: Legal keyword string (e.g., "unfair dismissal grounds Section 12B Labour Act")
   - Variation 3: Alternative phrasing or related concept (e.g., "termination without cause requirements")
2. "hydePassage": Generate a Hypothetical Document Embedding (HyDE) passage:
   - Write a short (3-4 sentences) hypothetical legal paragraph that *would* answer the user's question.
   - Use plausible legal language, citing relevant acts (e.g., Labour Act, Constitution) if known.
   - Do NOT hallucinate specific case citations unless you are 100% sure. Focus on statutory language and legal principles.
3. Always include "Zimbabwe" context in at least one variation if not implicit.
4. Preserve specific case names if provided by the user.

EXAMPLES:

Input: "can i be fired without notice?"
Output:
{
  "variations": [
    "Can an employee be dismissed without notice in Zimbabwe?",
    "termination on notice provisions Labour Act Zimbabwe",
    "dismissal without notice requirements and exemptions"
  ],
  "hydePassage": "In terms of the Labour Act [Chapter 28:01], no employer shall terminate a contract of employment on notice unless the termination is in terms of an employment code or the employee typically agrees. Dismissal without notice is generally reserved for acts of gross misconduct inconsistent with the fulfillment of the express or implied conditions of the contract of employment."
}

Input: "Don Nyamande case"
Output:
{
  "variations": [
    "Don Nyamande v Zuva Petroleum Supreme Court judgment",
    "common law right to terminate on notice Nyamande case",
    "impact of Zuva Petroleum judgment on labour law"
  ],
  "hydePassage": "The Supreme Court judgment in Don Nyamande v Zuva Petroleum confirmed the common law right of an employer to terminate a contract of employment on notice. This ruling established that Section 12B of the Labour Act did not abolish the employer's right to terminate on notice, leading to subsequent legislative amendments to protect employees from arbitrary termination."
}`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {},
});

/**
 * Query enhancement cache
 */
const enhancementCache = new Map<
  string,
  { enhanced: any; timestamp: number }
>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 1000;

/**
 * Create cache key
 */
function createCacheKey(query: string, context: string): string {
  const str = `${query}|${context}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return `${query.substring(0, 50)}_${hash}`;
}

/**
 * Enhance a search query using conversation context
 */
export async function enhanceSearchQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: {
    maxContextMessages?: number;
    useCache?: boolean;
  } = {}
): Promise<{ variations: string[]; hydePassage: string }> {
  const { maxContextMessages = 5, useCache = true } = options;

  try {
    // Build context
    const recentContext = conversationHistory
      .slice(-maxContextMessages)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}`)
      .join("\n");

    // Check cache
    if (useCache) {
      const cacheKey = createCacheKey(query, recentContext);
      const cached = enhancementCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Query Enhancer] Cache hit for: "${query}"`);
        return cached.enhanced;
      }
    }

    const prompt = `${
      recentContext ? `CONVERSATION CONTEXT:\n${recentContext}\n\n` : ""
    }USER QUERY: ${query}

Generate the JSON object with variations and HyDE passage.`;

    const result = await queryEnhancerAgent.generate(prompt, {
      output: {
        type: "object",
        properties: {
          variations: {
            type: "array",
            items: { type: "string" },
          },
          hydePassage: { type: "string" },
        },
      },
    });

    const enhanced = result.object as {
      variations: string[];
      hydePassage: string;
    };

    console.log(`[Query Enhancer] Original: "${query}"`);
    console.log("[Query Enhancer] Variations:", enhanced.variations);
    console.log(
      `[Query Enhancer] HyDE: "${enhanced.hydePassage.substring(0, 50)}..."`
    );

    // Cache result
    if (useCache) {
      const cacheKey = createCacheKey(query, recentContext);
      enhancementCache.set(cacheKey, {
        enhanced,
        timestamp: Date.now(),
      });
    }

    return enhanced;
  } catch (error) {
    console.error("[Query Enhancer] Error:", error);
    // Fallback
    return {
      variations: [`${query} Zimbabwe`, `${query} legal`, query],
      hydePassage: `${query} This is a legal issue in Zimbabwe regarding ${query}.`,
    };
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getEnhancementCacheStats() {
  return {
    size: enhancementCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
  };
}

/**
 * Clear the enhancement cache (useful for testing or manual cleanup)
 */
export function clearEnhancementCache() {
  enhancementCache.clear();
  console.log("[Query Enhancer] Cache cleared");
}
