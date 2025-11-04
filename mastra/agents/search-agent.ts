import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProvider();

/**
 * Search Agent - Step 1 of Deep Research Workflow
 * Finds relevant sources (max 4 searches)
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

  model: () => cerebrasProvider("gpt-oss-120b"),

  tools: {
    tavilySearchAdvancedTool,
  },
});
