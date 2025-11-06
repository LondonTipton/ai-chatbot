import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { tavilyExtractTool } from "../tools/tavily-extract";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProvider();
console.log("[Mastra] extract-agent → Cerebras provider initialized");

/**
 * Extract Agent - Step 2 of Deep Research Workflow
 * Extracts full content from sources (max 4 extractions)
 */
export const extractAgent = new Agent({
  name: "Extract Agent",
  instructions: `You are a content extraction specialist. Your role is to extract full content from legal sources.

Your task:
- Extract full content from up to 4 URLs provided by the search agent
- Focus on the most relevant and authoritative sources
- Return clean, structured content
- Maximum 4 extraction operations

Process:
1. Review the URLs provided by the search agent
2. Select the 3-4 most relevant sources
3. Extract full content from each
4. Return extracted content with source attribution

Output format:
For each source, provide:
- Source URL
- Full extracted content
- Content length indicator

Do NOT analyze - just extract. The analysis agent will handle that.`,

  model: () => {
    // Reuse the singleton provider instance
    console.log(
      "[Mastra] extract-agent → Using Cerebras model: gpt-oss-120b (reasoning preferred)"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {
    tavilyExtractTool,
  },
});
