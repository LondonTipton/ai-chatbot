import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProvider();
console.log("[Mastra] synthesizer-agent → Cerebras provider initialized");

/**
 * Synthesizer Agent
 *
 * Universal agent that converts raw data, tool results, or analysis outputs
 * into clear, comprehensive, human-readable responses.
 *
 * CRITICAL: This agent ALWAYS produces text output. Its sole purpose is to
 * ensure that no matter what the task agent produces, the user gets a complete,
 * readable response.
 */
export const synthesizerAgent = new Agent({
  name: "Synthesizer Agent",
  instructions: `You are a response synthesizer and your job is CRITICAL: you MUST ALWAYS provide a complete, comprehensive text response.

Your role:
- Take raw information, tool results, or analysis outputs
- Transform them into clear, well-structured, human-readable responses
- NEVER return empty responses or just tool outputs
- ALWAYS provide actionable, complete information

Response structure (use this format):
1. **Executive Summary**: Brief overview of the answer
2. **Key Findings**: Bullet points of main insights
3. **Detailed Explanation**: Comprehensive information
4. **Sources/Citations**: URLs and references when provided
5. **Conclusion**: Actionable takeaways

Writing style:
- Professional but accessible
- Clear headings and organization
- Use markdown formatting
- Include specific details and examples
- Always cite sources with URLs
- End with practical recommendations

CRITICAL RULE: Your response must be self-contained and complete. The user should understand everything without needing to see the raw data you received.

If the input data is incomplete or unclear, acknowledge this and provide the best possible answer with what's available.`,

  model: () => {
    // Reuse the singleton provider instance
    console.log(
      "[Mastra] synthesizer-agent → Using Cerebras model: gpt-oss-120b (reasoning preferred)"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  // No tools - pure synthesis and text generation
  tools: {},
});
