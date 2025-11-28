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
        const { getBalancedCerebrasProviderSync } = await import(
          "@/lib/ai/cerebras-key-balancer"
        );

        // Import ALL research tools (matching main chat agent)
        const { quickFactSearchTool } = await import(
          "@/mastra/tools/quick-fact-search-tool"
        );
        const { standardResearchTool } = await import(
          "@/mastra/tools/standard-research-tool"
        );
        const { multiSearchTool } = await import(
          "@/mastra/tools/multi-search-tool"
        );
        const { deepResearchTool } = await import(
          "@/mastra/tools/deep-research-tool"
        );

        const cerebrasProvider = getBalancedCerebrasProviderSync();
        const contextTools = createToolsWithContext(options.userId);

        // Import main chat agent to get its instructions
        const { chatAgent: mainChatAgent } = await import(
          "@/mastra/agents/chat-agent"
        );

        agent = new Agent({
          name: "chat-agent",
          instructions: mainChatAgent.instructions, // Use same instructions as main agent
          model: () => cerebrasProvider("gpt-oss-120b"),
          tools: {
            // All 4 research tools (matching main chat agent)
            quickFactSearch: quickFactSearchTool,
            standardResearch: standardResearchTool,
            multiSearch: multiSearchTool,
            deepResearch: deepResearchTool,
            // Document tools with user context
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
        const { getBalancedCerebrasProviderSync } = await import(
          "@/lib/ai/cerebras-key-balancer"
        );

        // Import ALL research tools (matching main chat agent)
        const { quickFactSearchTool } = await import(
          "@/mastra/tools/quick-fact-search-tool"
        );
        const { standardResearchTool } = await import(
          "@/mastra/tools/standard-research-tool"
        );
        const { multiSearchTool } = await import(
          "@/mastra/tools/multi-search-tool"
        );
        const { deepResearchTool } = await import(
          "@/mastra/tools/deep-research-tool"
        );

        const cerebrasProvider = getBalancedCerebrasProviderSync();
        const contextTools = createToolsWithContext(options.userId);

        // Import main chat agent to get its instructions
        const { chatAgent: mainChatAgent } = await import(
          "@/mastra/agents/chat-agent"
        );

        agent = new Agent({
          name: "chat-agent",
          instructions: mainChatAgent.instructions, // Use same instructions as main agent
          model: () => cerebrasProvider("gpt-oss-120b"),
          tools: {
            // All 4 research tools (matching main chat agent)
            quickFactSearch: quickFactSearchTool,
            standardResearch: standardResearchTool,
            multiSearch: multiSearchTool,
            deepResearch: deepResearchTool,
            // Document tools with user context
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

  // Prepare conversation history for tools (exclude current message)
  const conversationHistory = mastraMessages.slice(0, -1).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  logger.log(
    `[Mastra SDK] Prepared conversation history for tools: ${conversationHistory.length} messages`
  );

  // Stream with AI SDK v5 format
  // Pass conversation history through agentContext so tools can access it
  // Wrap in retry handler for rate limit protection
  try {
    const stream = await withCerebrasRetry(
      async () => {
        return await agent.stream(mastraMessages, {
          format: "aisdk", // AI SDK v5 format
          maxSteps: 15, // Allow multiple tool calls
          // Pass conversation history through agentContext
          agentContext: {
            conversationHistory,
            userId: options?.userId,
            chatId: options?.chatId,
            sessionId: options?.sessionId,
          },
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
 * Wrap a Mastra stream with resumable stream context
 * Enables automatic recovery if connection is lost during streaming
 *
 * @param stream - Mastra agent stream (from agent.stream())
 * @param streamId - Unique stream identifier for recovery
 * @param streamContext - Resumable stream context (from getStreamContext())
 * @param callbacks - onFinish and onError callbacks for stream lifecycle
 * @returns Response object with resumable stream
 */
export async function createResumableMastraStream(
  stream: any,
  streamId: string,
  streamContext: any,
  callbacks?: {
    onFinish?: (result: { messages: any[] }) => Promise<void>;
    onError?: (result: { error: Error | string }) => Promise<void>;
  }
) {
  logger.log("[Mastra SDK] Creating resumable stream wrapper", {
    streamId: streamId.substring(0, 8),
    hasContext: !!streamContext,
  });

  if (!streamContext) {
    // Fallback to regular stream if context not available
    logger.warn(
      "[Mastra SDK] ⚠️  No resumable context - using regular stream (no recovery on disconnect)"
    );
    return stream.toUIMessageStreamResponse(callbacks);
  }

  // Create the base stream response with callbacks
  const baseStreamResponse = stream.toUIMessageStreamResponse(callbacks);

  // Wrap in resumable stream context for automatic recovery
  try {
    const resumableStream = await streamContext.resumableStream(
      streamId,
      () => baseStreamResponse
    );

    logger.log(
      "[Mastra SDK] ✅ Resumable stream created successfully - connection recovery enabled"
    );

    return new Response(resumableStream, {
      status: 200,
      headers: baseStreamResponse.headers,
    });
  } catch (error) {
    logger.error(
      "[Mastra SDK] ❌ Failed to create resumable stream, falling back to regular stream:",
      error
    );
    // Fallback to regular stream if resumable wrapper fails
    return baseStreamResponse;
  }
}
