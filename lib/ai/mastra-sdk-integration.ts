/**
 * Mastra AI SDK Integration
 *
 * Official @mastra/ai-sdk integration helpers for AI SDK v5 compatibility
 * This module provides utilities to integrate Mastra agents with the existing chat route
 */

import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";
import { handleCerebrasError } from "./cerebras-key-balancer";
import { withCerebrasRetry } from "./cerebras-retry-handler";
import type { QueryComplexity } from "./complexity-detector";

const logger = createLogger("ai/mastra-sdk-integration");

export type MastraStreamOptions = {
  userId?: string;
  chatId?: string;
  sessionId?: string;
  agentName?: string; // Override agent selection
  memory?: {
    thread?: string;
    resource?: string;
  };
};

/**
 * Stream a Mastra agent response using official @mastra/ai-sdk pattern
 *
 * This function uses the agent.stream() method with format: "aisdk" to ensure
 * AI SDK v5 compatibility. The returned stream can use toUIMessageStreamResponse().
 *
 * @param complexity - Query complexity level
 * @param query - User query text
 * @param options - Optional context and memory configuration
 * @returns AI SDK v5 compatible stream
 */
export async function streamMastraAgent(
  complexity: QueryComplexity,
  query: string,
  options?: MastraStreamOptions
) {
  logger.log("[Mastra SDK] Streaming agent (official pattern)", {
    complexity,
    query: query.substring(0, 100),
    options,
  });

  // Select agent based on complexity or use override
  const agentName = options?.agentName || selectAgentForComplexity(complexity);

  logger.log(`[Mastra SDK] Selected agent: ${agentName}`);

  // Get the agent from Mastra instance
  // If userId is provided, use factory for context injection (enables document tools)
  let agent: any;

  if (options?.userId) {
    logger.log(
      `[Mastra SDK] Creating ${agentName} with userId context: ${options.userId}`
    );

    switch (agentName) {
      case "chatAgent": {
        // Chat agent needs factory for document tools
        const { createToolsWithContext } = await import(
          "@/lib/services/tool-context-factory"
        );
        const { Agent } = await import("@mastra/core/agent");
        const { getBalancedCerebrasProvider } = await import(
          "@/lib/ai/cerebras-key-balancer"
        );
        const { advancedSearchWorkflowTool } = await import(
          "@/mastra/tools/advanced-search-workflow-tool"
        );

        const cerebrasProvider = getBalancedCerebrasProvider();
        const contextTools = createToolsWithContext(options.userId);

        agent = new Agent({
          name: "chat-agent",
          instructions: `You are DeepCounsel, a helpful legal AI assistant for Zimbabwe.

**CRITICAL: When user asks to "create a document" or "draft a document", you MUST call the createDocument tool. Do NOT write document content in your response.**

Your capabilities:
- Answer legal questions about Zimbabwe law
- Use the advancedSearchWorkflow tool for complex research queries requiring multiple sources
- Create documents using the createDocument tool
- Update existing documents using the updateDocument tool
- Provide legal information and guidance

When to use advancedSearchWorkflow:
- User asks for comprehensive research on a topic
- Query requires multiple perspectives or sources
- Question involves case law, precedents, or detailed legal analysis
- User explicitly requests "research" or "find cases about"

When NOT to use advancedSearchWorkflow:
- Simple definitions or explanations
- Direct questions with straightforward answers
- General legal guidance

When responding:
1. Be clear, concise, and professional
2. Provide accurate legal information about Zimbabwe
3. **Use advancedSearchWorkflow tool for research-intensive queries**
4. **ALWAYS use createDocument tool when asked to create/draft documents**
5. Use updateDocument tool when asked to modify documents
6. Cite relevant Zimbabwe laws and statutes when applicable

DOCUMENT CREATION RULE:
- User says: "Create a document about X"
- You MUST: Call createDocument({ title: "X", kind: "text" })
- You MUST NOT: Write the document content in your response

Remember: You provide legal information, not legal advice. Always recommend consulting qualified legal professionals for specific legal matters.`,
          model: () => cerebrasProvider("gpt-oss-120b"),
          tools: {
            advancedSearchWorkflow: advancedSearchWorkflowTool,
            createDocument: contextTools.createDocument,
            updateDocument: contextTools.updateDocument,
          },
        });
        break;
      }
      case "legalAgent": {
        const { createLegalAgentWithContext } = await import(
          "@/mastra/agents/legal-agent-factory"
        );
        agent = createLegalAgentWithContext(options.userId);
        break;
      }
      case "mediumResearchAgent": {
        const { createMediumResearchAgentWithContext } = await import(
          "@/mastra/agents/medium-research-agent-factory"
        );
        agent = createMediumResearchAgentWithContext(options.userId);
        break;
      }
      case "searchAgent": {
        const { createSearchAgentWithContext } = await import(
          "@/mastra/agents/search-agent-factory"
        );
        agent = createSearchAgentWithContext(options.userId);
        break;
      }
      default:
        agent = mastra.getAgent(agentName as any);
    }
  } else {
    agent = mastra.getAgent(agentName as any);
  }

  if (!agent) {
    throw new Error(`Agent '${agentName}' not found in Mastra instance`);
  }

  // Stream with AI SDK v5 format
  // Don't pass memory config or context - just the messages
  // Wrap in retry handler for rate limit protection
  try {
    const stream = await withCerebrasRetry(
      async () => {
        return await agent.stream([{ role: "user", content: query }], {
          format: "aisdk", // AI SDK v5 format
          maxSteps: 15, // Allow multiple tool calls
        } as any);
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 15_000,
        onRetry: (attempt, delay, error) => {
          logger.warn(
            `[Mastra SDK] Retry attempt ${attempt} after ${Math.round(
              delay
            )}ms due to:`,
            error.message
          );
          // Mark the key as failed for rotation
          handleCerebrasError(error);
        },
      }
    );

    logger.log("[Mastra SDK] ✅ Stream created successfully");
    return stream;
  } catch (error) {
    // Final error after all retries
    logger.error(
      "[Mastra SDK] ❌ Failed to create stream after retries:",
      error
    );
    handleCerebrasError(error);
    throw error;
  }
}

/**
 * Select the appropriate Mastra agent based on query complexity
 *
 * @param complexity - Query complexity level
 * @returns Agent name
 */
function selectAgentForComplexity(complexity: QueryComplexity): string {
  switch (complexity) {
    case "basic":
      return "chatAgent"; // Quick queries - agent decides: direct answer OR quickFactSearch tool

    case "light":
      return "chatAgent"; // Fast queries - agent decides: direct answer OR standardResearch tool

    case "medium":
      return "chatAgent"; // Research queries - agent has all 4 workflow tools available

    case "advanced":
      return "chatAgent"; // Comprehensive queries - agent can use comprehensiveResearch tool

    case "deep":
    case "workflow-review":
    case "workflow-drafting":
    case "workflow-caselaw":
      return "searchAgent"; // Multi-agent deep research workflows (forced execution)

    default:
      logger.warn(
        `[Mastra SDK] Unknown complexity: ${complexity}, using chatAgent`
      );
      return "chatAgent";
  }
}

/**
 * Convert messages array to Mastra format
 *
 * @param messages - UI messages from chat
 * @returns Mastra-compatible messages
 */
export function convertToMastraMessages(messages: any[]) {
  return messages.map((msg) => {
    // Handle different message formats
    if (msg.role && msg.content) {
      return { role: msg.role, content: msg.content };
    }

    // Handle UI message format with parts
    if (msg.role && msg.parts) {
      const textParts = msg.parts
        .filter((part: any) => typeof part === "string" || part.text)
        .map((part: any) => (typeof part === "string" ? part : part.text));

      return {
        role: msg.role,
        content: textParts.join("\n"),
      };
    }

    return msg;
  });
}

/**
 * Stream a Mastra agent with full message history
 *
 * This version accepts the full message history for context-aware responses
 *
 * @param complexity - Query complexity level
 * @param messages - Full message history
 * @param options - Optional context and memory configuration
 * @returns AI SDK v5 compatible stream
 */
export async function streamMastraAgentWithHistory(
  complexity: QueryComplexity,
  messages: any[],
  options?: MastraStreamOptions
) {
  logger.log("[Mastra SDK] Streaming agent with history (official pattern)", {
    complexity,
    messageCount: messages.length,
    options,
  });

  // Select agent based on complexity
  const agentName = selectAgentForComplexity(complexity);

  logger.log(`[Mastra SDK] Selected agent: ${agentName}`);

  // Get the agent from Mastra instance
  // If userId is provided, use factory for context injection (enables document tools)
  let agent: any;

  if (options?.userId) {
    logger.log(
      `[Mastra SDK] Creating ${agentName} with userId context: ${options.userId}`
    );

    switch (agentName) {
      case "chatAgent": {
        // Chat agent needs factory for document tools
        const { createToolsWithContext } = await import(
          "@/lib/services/tool-context-factory"
        );
        const { Agent } = await import("@mastra/core/agent");
        const { getBalancedCerebrasProvider } = await import(
          "@/lib/ai/cerebras-key-balancer"
        );
        const { advancedSearchWorkflowTool } = await import(
          "@/mastra/tools/advanced-search-workflow-tool"
        );

        const cerebrasProvider = getBalancedCerebrasProvider();
        const contextTools = createToolsWithContext(options.userId);

        agent = new Agent({
          name: "chat-agent",
          instructions: `You are DeepCounsel, a helpful legal AI assistant for Zimbabwe.

**CRITICAL: When user asks to "create a document" or "draft a document", you MUST call the createDocument tool. Do NOT write document content in your response.**

Your capabilities:
- Answer legal questions about Zimbabwe law
- Use the advancedSearchWorkflow tool for complex research queries requiring multiple sources
- Create documents using the createDocument tool
- Update existing documents using the updateDocument tool
- Provide legal information and guidance

When to use advancedSearchWorkflow:
- User asks for comprehensive research on a topic
- Query requires multiple perspectives or sources
- Question involves case law, precedents, or detailed legal analysis
- User explicitly requests "research" or "find cases about"

When NOT to use advancedSearchWorkflow:
- Simple definitions or explanations
- Direct questions with straightforward answers
- General legal guidance

When responding:
1. Be clear, concise, and professional
2. Provide accurate legal information about Zimbabwe
3. **Use advancedSearchWorkflow tool for research-intensive queries**
4. **ALWAYS use createDocument tool when asked to create/draft documents**
5. Use updateDocument tool when asked to modify documents
6. Cite relevant Zimbabwe laws and statutes when applicable

DOCUMENT CREATION RULE:
- User says: "Create a document about X"
- You MUST: Call createDocument({ title: "X", kind: "text" })
- You MUST NOT: Write the document content in your response

Remember: You provide legal information, not legal advice. Always recommend consulting qualified legal professionals for specific legal matters.`,
          model: () => cerebrasProvider("gpt-oss-120b"),
          tools: {
            advancedSearchWorkflow: advancedSearchWorkflowTool,
            createDocument: contextTools.createDocument,
            updateDocument: contextTools.updateDocument,
          },
        });
        break;
      }
      case "legalAgent": {
        const { createLegalAgentWithContext } = await import(
          "@/mastra/agents/legal-agent-factory"
        );
        agent = createLegalAgentWithContext(options.userId);
        break;
      }
      case "mediumResearchAgent": {
        const { createMediumResearchAgentWithContext } = await import(
          "@/mastra/agents/medium-research-agent-factory"
        );
        agent = createMediumResearchAgentWithContext(options.userId);
        break;
      }
      case "searchAgent": {
        const { createSearchAgentWithContext } = await import(
          "@/mastra/agents/search-agent-factory"
        );
        agent = createSearchAgentWithContext(options.userId);
        break;
      }
      default:
        agent = mastra.getAgent(agentName as any);
    }
  } else {
    agent = mastra.getAgent(agentName as any);
  }

  if (!agent) {
    throw new Error(`Agent '${agentName}' not found in Mastra instance`);
  }

  // Convert messages to Mastra format
  const mastraMessages = convertToMastraMessages(messages);

  logger.log("[Mastra SDK] Message count:", mastraMessages.length);

  // Stream with AI SDK v5 format
  // Don't pass memory config or context - just the messages
  // Wrap in retry handler for rate limit protection
  try {
    const stream = await withCerebrasRetry(
      async () => {
        return await agent.stream(mastraMessages, {
          format: "aisdk", // AI SDK v5 format
          maxSteps: 15, // Allow multiple tool calls
        } as any);
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 15_000,
        onRetry: (attempt, delay, error) => {
          logger.warn(
            `[Mastra SDK] Retry attempt ${attempt} after ${Math.round(
              delay
            )}ms due to:`,
            error.message
          );
          // Mark the key as failed for rotation
          handleCerebrasError(error);
        },
      }
    );

    logger.log("[Mastra SDK] ✅ Stream created successfully");
    return stream;
  } catch (error) {
    // Final error after all retries
    logger.error(
      "[Mastra SDK] ❌ Failed to create stream after retries:",
      error
    );
    handleCerebrasError(error);
    throw error;
  }
}
