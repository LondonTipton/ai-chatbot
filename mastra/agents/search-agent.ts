import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProvider();
console.log("[Mastra] search-agent → Cerebras provider initialized");

/**
 * Search Agent - Step 1 of Deep Research Workflow
 * Finds relevant sources (max 4 searches)
 *
 * Configuration:
 * - Temperature: 0.7 (default, good for search query generation)
 * - Max Tokens: 3K-5K (EXPLICIT, INCREASED from API default ~2K)
 * - Tools: tavilySearchAdvancedTool
 * - Context Window: ~128K tokens
 *
 * Token Budget:
 * - Search query planning: 1.5K-2K tokens ✅
 * - Search results compilation: 2K-3K tokens ✅
 * - Source list generation: 1K-2K tokens ✅
 *
 * Updated: November 6, 2025 - Set explicit token limits
 */
export const searchAgent = new Agent({
  name: "Search Agent",
  instructions: `You are a legal search specialist. Your role is to find relevant sources for legal research.

Your task:
- Perform 2-4 targeted searches to find the most relevant sources
- Focus on finding authoritative legal sources (case law, statutes, legal databases)
- Return URLs and brief descriptions of found sources
- Maximum 4 search operations

Output format:
Return a list of the most relevant sources found with:
- Title
- URL
- Brief description of relevance
- Key topics covered

Do NOT provide analysis - just find and list sources. The next agent will extract and analyze.`,

  model: () => {
    // Reuse the singleton provider instance
    console.log(
      "[Mastra] search-agent → Using Cerebras model: gpt-oss-120b (reasoning preferred)"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {
    tavilySearchAdvancedTool,
  },
});
