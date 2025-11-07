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
 * Query enhancement cache for common patterns
 * Key: query + context hash, Value: enhanced query
 */
const enhancementCache = new Map<
  string,
  { enhanced: string; timestamp: number }
>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 1000;

/**
 * Case indicators for query type detection (module-level for performance)
 */
const CASE_INDICATORS = [
  /\sv\s/i, // "X v Y" pattern
  /case/i,
  /judgment/i,
  /ruling/i,
  /court/i,
  /appellant/i,
  /respondent/i,
  /\[20\d{2}\]/i, // Citation like [2023]
  /sc\s*\d+/i, // SC 43/15
  /zwsc|zwhhc|zwcc/i, // Court codes
];

/**
 * Statute indicators for query type detection (module-level for performance)
 */
const STATUTE_INDICATORS = [
  /act/i,
  /section/i,
  /chapter/i,
  /statute/i,
  /legislation/i,
  /law/i,
  /provision/i,
  /clause/i,
];

/**
 * Detect query type for targeted enhancement
 */
function detectQueryType(query: string): "case" | "statute" | "general" {
  const queryLower = query.toLowerCase();

  // Check for case indicators
  if (CASE_INDICATORS.some((pattern) => pattern.test(queryLower))) {
    return "case";
  }

  // Check for statute indicators
  if (STATUTE_INDICATORS.some((pattern) => pattern.test(queryLower))) {
    return "statute";
  }

  return "general";
}

/**
 * Create cache key from query and context
 */
function createCacheKey(query: string, context: string): string {
  // Simple hash function for cache key
  const str = `${query}|${context}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32-bit integer
  }
  return `${query.substring(0, 50)}_${hash}`;
}

/**
 * Clean up expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of enhancementCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      enhancementCache.delete(key);
    }
  }

  // If cache is still too large, remove oldest entries
  if (enhancementCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(enhancementCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    const toRemove = entries.slice(0, enhancementCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      enhancementCache.delete(key);
    }
  }
}

/**
 * Enhance a search query using conversation context
 *
 * @param query - The user's search query
 * @param conversationHistory - Recent conversation messages (uses last 5-7 messages)
 * @param options - Optional configuration
 * @returns Enhanced query string
 */
export async function enhanceSearchQuery(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  options: {
    maxContextMessages?: number;
    useCache?: boolean;
    queryType?: "case" | "statute" | "general" | "auto";
  } = {}
): Promise<string> {
  const {
    maxContextMessages = 5, // Increased from 3 to 5 for better context
    useCache = true,
    queryType = "auto",
  } = options;

  try {
    // Detect query type if auto
    const detectedType =
      queryType === "auto" ? detectQueryType(query) : queryType;

    // Build context from recent conversation (last 5 messages by default)
    const recentContext = conversationHistory
      .slice(-maxContextMessages)
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 200)}`) // Limit content length
      .join("\n");

    // Check cache if enabled
    if (useCache) {
      const cacheKey = createCacheKey(query, recentContext);
      const cached = enhancementCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Query Enhancer] Cache hit for: "${query}"`);
        console.log(`[Query Enhancer] Cached enhanced: "${cached.enhanced}"`);
        return cached.enhanced;
      }
    }

    // Build type-specific enhancement instructions
    let typeInstructions = "";
    switch (detectedType) {
      case "case":
        typeInstructions =
          "\nQUERY TYPE: Legal case - Prioritize: case name, court, citation, judgment, ruling";
        break;
      case "statute":
        typeInstructions =
          "\nQUERY TYPE: Statute/legislation - Prioritize: act name, section, chapter, provision";
        break;
      default:
        typeInstructions =
          "\nQUERY TYPE: General legal query - Prioritize: legal domain, Zimbabwe context";
        break;
    }

    const prompt = `${
      recentContext ? `CONVERSATION CONTEXT:\n${recentContext}\n\n` : ""
    }USER QUERY: ${query}${typeInstructions}

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
    console.log(`[Query Enhancer] Type: ${detectedType}`);
    console.log(`[Query Enhancer] Enhanced: "${enhanced}"`);

    // Cache the result if enabled
    if (useCache) {
      const cacheKey = createCacheKey(query, recentContext);
      enhancementCache.set(cacheKey, {
        enhanced,
        timestamp: Date.now(),
      });

      // Clean cache periodically
      if (enhancementCache.size > MAX_CACHE_SIZE * 0.9) {
        cleanCache();
      }

      console.log(
        `[Query Enhancer] Cached result (cache size: ${enhancementCache.size})`
      );
    }

    return enhanced;
  } catch (error) {
    console.error("[Query Enhancer] Error:", error);
    // Fallback: just add Zimbabwe
    return `${query} Zimbabwe`;
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
