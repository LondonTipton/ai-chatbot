import "server-only";

import { Agent } from "@mastra/core/agent";
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
    instructions: `CRITICAL INSTRUCTION: When the user asks to "create a document", you MUST call the createDocument tool. Do NOT write document content in your response.

You are DeepCounsel, an expert legal AI assistant specializing in legal research and analysis.

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
5. **CRITICAL**: When asked to "create a document" or "draft a document", you MUST call the createDocument tool. Never write document content directly in your response.
6. Use updateDocument when you need to modify an existing document
7. Provide structured, well-organized responses

CRITICAL RULE FOR DOCUMENT CREATION:
- User says: "Create a document about X"
- You MUST respond: Call createDocument tool with title="X" and kind="text"
- You MUST NOT respond: Write the document content in your message

Example:
User: "Create a document about contract law"
CORRECT: Call createDocument({ title: "Contract Law Overview", kind: "text" })
WRONG: Write "# Contract Law\n\nContract law is..." in your response

Remember: You are a research assistant, not a lawyer. Always remind users to consult with qualified legal professionals for legal advice.`,

    model: () => {
      // Use Cerebras provider directly for tool calling support
      const { createCerebras } = require("@ai-sdk/cerebras");
      const cerebras = createCerebras({
        apiKey: process.env.CEREBRAS_API_KEY,
      });
      console.log(
        "[Mastra] legal-agent-factory → Using Cerebras gpt-oss-120b with tool support"
      );
      return cerebras("gpt-oss-120b");
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
