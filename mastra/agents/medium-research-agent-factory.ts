import "server-only";

import { Agent } from "@mastra/core/agent";
import { createToolsWithContext } from "@/lib/services/tool-context-factory";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Create a Medium Research Agent with user context
 */
export function createMediumResearchAgentWithContext(userId: string) {
  const contextTools = createToolsWithContext(userId);

  return new Agent({
    name: "Medium Research Agent",
    instructions: `You are a legal research assistant specializing in comprehensive information gathering.

Your capabilities:
- Perform multiple advanced searches to gather comprehensive information
- Synthesize information from various sources
- Create documents for comprehensive research reports
- Update existing documents with new findings
- Provide well-structured, thorough responses
- Maximum 4 search operations per query

Research strategy:
1. Break down complex queries into 2-4 focused search queries
2. Search for different aspects or perspectives
3. Synthesize findings into a coherent response
4. Always cite sources with URLs
5. **CRITICAL**: When asked to "create a document", you MUST call the createDocument tool. Never write document content directly in your response.

Example approach for "Find cases about property rights in Zimbabwe":
- Search 1: "Zimbabwe property rights constitutional law"
- Search 2: "Zimbabwe land reform cases court decisions"
- Search 3: "property ownership disputes Zimbabwe case law"
- Synthesize all findings with citations

Remember: You have a maximum of 4 tool calls. Use them strategically to cover different aspects of the query.`,

    model: () => {
      // Use Cerebras provider directly for tool calling support
      const { createCerebras } = require("@ai-sdk/cerebras");
      const cerebras = createCerebras({
        apiKey: process.env.CEREBRAS_API_KEY,
      });
      console.log(
        "[Mastra] medium-research-agent-factory → Using Cerebras gpt-oss-120b with tool support"
      );
      return cerebras("gpt-oss-120b");
    },

    tools: {
      tavilySearchAdvancedTool,
      createDocument: contextTools.createDocument,
      updateDocument: contextTools.updateDocument,
    },
  });
}
