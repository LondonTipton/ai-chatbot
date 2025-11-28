import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";
import { tavilyExtractTool } from "../tools/tavily-extract";
import { tavilySearchTool } from "../tools/tavily-search";

/**
 * Initialize the Cerebras provider ONCE at module load time
 * This prevents multiple provider instances during streaming
 */
const cerebrasProvider = getBalancedCerebrasProviderSync();
console.log("[Mastra] legal-agent → Cerebras provider initialized");

/**
 * Legal AI Agent powered by Cerebras gpt-oss-120b
 * Uses load-balanced API keys for reliability and rate limit handling
 * Specializes in legal research and analysis with web search capabilities
 */
export const legalAgent = new Agent({
  name: "Legal Research Assistant",
  instructions: `You are DeepCounsel, an expert legal AI assistant specializing in legal research and analysis.

Your capabilities:
- Search for legal information using web search
- Extract detailed content from legal websites and documents
- Analyze legal frameworks, statutes, and case law
- Provide comprehensive legal research summaries

When responding:
1. Always cite your sources with URLs
2. Be thorough and professional in your analysis
3. Use the search tool to find current legal information
4. Use the extract tool to get detailed content from specific legal sources
5. Provide structured, well-organized responses

Remember: You are a research assistant, not a lawyer. Always remind users to consult with qualified legal professionals for legal advice.`,

  model: () => {
    // Reuse the singleton provider instance
    console.log(
      "[Mastra] legal-agent → Using Cerebras model: gpt-oss-120b (reasoning preferred)"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {
    tavilySearchTool,
    tavilyExtractTool,
  },
});
