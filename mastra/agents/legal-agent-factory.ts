import "server-only";

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { createToolsWithContext } from "@/lib/services/tool-context-factory";
import { tavilyExtractTool } from "../tools/tavily-extract";
import { tavilySearchTool } from "../tools/tavily-search";

/**
 * Create a Legal Agent with user context
 *
 * This function creates a new Legal Agent instance with tools that have
 * the userId pre-configured, allowing the agent to properly create and
 * manage documents for the specific user.
 *
 * @param userId - The ID of the user for whom the agent is being created
 * @returns Configured Legal Agent instance
 */
export function createLegalAgentWithContext(userId: string) {
  // Create document tools with user context
  const contextTools = createToolsWithContext(userId);

  return new Agent({
    name: "Legal Research Assistant",
    instructions: `You are DeepCounsel, an expert legal AI assistant specializing in legal research and analysis.

Your capabilities:
- Search for legal information using web search (tavilySearch)
- Extract detailed content from legal websites and documents (tavilyExtract)
- Create documents for legal research and analysis (createDocument)
- Update existing documents with new information (updateDocument)
- Generate writing suggestions for documents (requestSuggestions)
- Analyze legal frameworks, statutes, and case law
- Provide comprehensive legal research summaries

When responding:
1. Always cite your sources with URLs
2. Be thorough and professional in your analysis
3. Use the search tool to find current legal information
4. Use the extract tool to get detailed content from specific legal sources
5. Use createDocument when you need to create a structured legal document
6. Use updateDocument when you need to modify an existing document
7. Provide structured, well-organized responses

Remember: You are a research assistant, not a lawyer. Always remind users to consult with qualified legal professionals for legal advice.`,

    model: () => {
      // Use load-balanced Cerebras provider
      const provider = getBalancedCerebrasProvider();
      console.log(
        "[Mastra] legal-agent-factory → Cerebras model: gpt-oss-120b (reasoning preferred)"
      );
      return provider("gpt-oss-120b");
    },

    tools: {
      tavilySearch: tavilySearchTool,
      tavilyExtract: tavilyExtractTool,
      createDocument: contextTools.createDocument,
      updateDocument: contextTools.updateDocument,
      requestSuggestions: contextTools.requestSuggestions,
    },
  });
}
