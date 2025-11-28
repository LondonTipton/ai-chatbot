import "server-only";

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";
import { createLogger } from "@/lib/logger";
import { createToolsWithContext } from "@/lib/services/tool-context-factory";
import { tavilySearchAdvancedTool } from "../tools/tavily-search-advanced";

/**
 * Create a Search Agent with user context
 */
export function createSearchAgentWithContext(userId: string) {
  const contextTools = createToolsWithContext(userId);

  return new Agent({
    name: "Search Agent",
    instructions: `You are a legal search specialist. Your role is to find relevant sources for legal research.

Your task:
- Perform 2-4 targeted searches to find the most relevant sources
- Focus on finding authoritative legal sources (case law, statutes, legal databases)
- Return URLs and brief descriptions of found sources
- Maximum 4 search operations
- **CRITICAL**: When asked to "create a document", you MUST call the createDocument tool

Output format:
Return a list of the most relevant sources found with:
- Title
- URL
- Brief description of relevance
- Key topics covered

IMPORTANT: If the user asks you to create any kind of document, you must use the createDocument tool. Do not write the document content in your chat response.`,

    model: () => {
      // Use Cerebras provider directly for tool calling support
      const { createCerebras } = require("@ai-sdk/cerebras");
      const cerebras = createCerebras({
        model: getBalancedCerebrasProviderSync()("gpt-oss-120b"),
      });
      console.log(
        "[Mastra] search-agent-factory → Using Cerebras gpt-oss-120b with tool support"
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
