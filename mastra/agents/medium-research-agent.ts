import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Medium Research Agent
 * Handles queries requiring multiple search operations
 * Maximum 4 tool calls per execution
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
4. Always cite sources with URLs

Example approach for "Find cases about property rights in Zimbabwe":
- Search 1: "Zimbabwe property rights constitutional law"
- Search 2: "Zimbabwe land reform cases court decisions"
- Search 3: "property ownership disputes Zimbabwe case law"
- Synthesize all findings with citations

Remember: You have a maximum of 4 tool calls. Use them strategically to cover different aspects of the query.`,

  model: () => {
    const provider = getBalancedCerebrasProvider();
    return provider("gpt-oss-120b");
  },

  tools: {
    tavilySearchAdvancedTool,
  },
});
