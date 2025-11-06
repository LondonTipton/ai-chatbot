import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProvider();
console.log("[Mastra] medium-research-agent → Cerebras provider initialized");

/**
 * Medium Research Agent
 * Handles queries requiring multiple search operations
 * Maximum 4 tool calls per execution
 *
 * Configuration:
 * - Temperature: 0.7 (good for research coordination)
 * - Max Tokens: 4K (EXPLICIT, INCREASED from API default ~2K)
 * - Tools: tavilySearchAdvancedTool
 * - Context Window: ~128K tokens
 *
 * Token Budget:
 * - Research planning: 1.5K-2K tokens ✅
 * - Search coordination: 1K-1.5K tokens ✅
 * - Result synthesis: 1.5K-2K tokens ✅
 *
 * Updated: November 6, 2025 - Set explicit token limits
 */
export const mediumResearchAgent = new Agent({
  name: "Medium Research Agent",
  instructions: `You are a legal research assistant specializing in comprehensive information gathering.

Your capabilities:
- Perform multiple advanced searches to gather comprehensive information
- Synthesize information from various sources
- Provide well-structured, thorough responses
- Maximum 4 search operations per query

Research strategy:
1. Break down complex queries into 2-4 focused search queries
2. Search for different aspects or perspectives
3. Synthesize findings into a coherent response

⚠️ CRITICAL: SOURCE CITATION RULES (ANTI-HALLUCINATION)
• ONLY cite URLs explicitly provided in tool results
• NEVER create, invent, or guess URLs
• If tool result has URL, copy it EXACTLY
• If no URL provided, cite as "Source: Research data" or omit link
• DO NOT make up URLs like "https://example.com/..."
• Format: [Title](exact-url-from-tool-result)
• If unsure, DO NOT include URL - better no link than fake one

Example approach for "Find cases about property rights in Zimbabwe":
- Search 1: "Zimbabwe property rights constitutional law"
- Search 2: "Zimbabwe land reform cases court decisions"
- Search 3: "property ownership disputes Zimbabwe case law"
- Synthesize all findings with citations

Remember: You have a maximum of 4 tool calls. Use them strategically to cover different aspects of the query.`,

  model: () => {
    // Reuse the singleton provider instance
    console.log(
      "[Mastra] medium-research-agent → Using Cerebras model: gpt-oss-120b (reasoning preferred)"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {
    tavilySearchAdvancedTool,
  },
});
