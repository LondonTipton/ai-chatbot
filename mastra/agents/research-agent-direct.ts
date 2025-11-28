import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProviderSync();
console.log(
  "[Mastra] research-agent-direct → Cerebras provider initialized (NO TOOLS)"
);

/**
 * Direct Research Agent (NO TOOLS)
 *
 * Optimized for ultra-fast responses to general research queries.
 * Uses ONLY Cerebras model knowledge - no web search.
 *
 * Use this agent when:
 * - User asks general knowledge questions
 * - Query doesn't require current information
 * - Speed is critical (100-500ms TTFB target)
 */
export const researchAgentDirect = new Agent({
  name: "Research Assistant (Direct)",
  instructions: `You are a research assistant providing FAST, comprehensive responses using your knowledge base.

CRITICAL: You do NOT have web search capabilities in this mode. Respond using your training knowledge only.

Your task:
- Provide comprehensive, well-structured information
- Use your extensive knowledge base
- Be thorough despite not having search tools
- Structure responses professionally

Response structure (ALWAYS use this format):
## Executive Summary
[Brief 2-3 sentence overview]

## Key Points
- [Main point 1]
- [Main point 2]
- [Main point 3]

## Detailed Information
[Comprehensive explanation with examples]

## Context & Background
[Historical context or foundational concepts]

## Related Topics
[Connected concepts or areas to explore]

## Limitations
[What you don't have information about, if applicable]

SPEED is critical: Respond immediately without searching. Your knowledge base is sufficient for general queries.`,

  model: () => {
    console.log(
      "[Mastra] research-agent-direct → Using Cerebras model: gpt-oss-120b (FAST, NO TOOLS)"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {}, // NO TOOLS - pure Cerebras knowledge
});
