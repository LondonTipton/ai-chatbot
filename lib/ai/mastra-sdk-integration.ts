/**
 * Mastra AI SDK Integration
 *
 * Official @mastra/ai-sdk integration helpers for AI SDK v5 compatibility
 * This module provides utilities to integrate Mastra agents with the existing chat route
 */

import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";
import type { QueryComplexity } from "./complexity-detector";

const logger = createLogger("ai/mastra-sdk-integration");

export type MastraStreamOptions = {
  userId?: string;
  chatId?: string;
  sessionId?: string;
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

  // Select agent based on complexity
  const agentName = selectAgentForComplexity(complexity);

  logger.log(`[Mastra SDK] Selected agent: ${agentName}`);

  // Get the agent from Mastra instance
  const agent = mastra.getAgent(agentName as any);

  if (!agent) {
    throw new Error(`Agent '${agentName}' not found in Mastra instance`);
  }

  // Build memory configuration if provided
  const memoryConfig = options?.memory
    ? {
        thread: options.memory.thread || options?.chatId || "default-thread",
        resource: options.memory.resource || options?.userId || "default-user",
      }
    : undefined;

  if (memoryConfig) {
    logger.log("[Mastra SDK] Memory config:", memoryConfig);
  }

  // Stream with AI SDK v5 format
  // This uses the official Mastra pattern from the documentation
  const stream = await agent.stream([{ role: "user", content: query }], {
    format: "aisdk", // AI SDK v5 format
    ...(memoryConfig && { memory: memoryConfig }),
  } as any);

  logger.log("[Mastra SDK] ✅ Stream created successfully");

  return stream;
}

/**
 * Select the appropriate Mastra agent based on query complexity
 *
 * @param complexity - Query complexity level
 * @returns Agent name
 */
function selectAgentForComplexity(complexity: QueryComplexity): string {
  switch (complexity) {
    case "simple":
    case "light":
      return "legalAgent"; // Fast, direct responses

    case "medium":
      return "mediumResearchAgent"; // Multiple searches, synthesis

    case "deep":
    case "workflow-review":
    case "workflow-drafting":
    case "workflow-caselaw":
      return "searchAgent"; // Deep research workflows

    default:
      logger.warn(
        `[Mastra SDK] Unknown complexity: ${complexity}, using legalAgent`
      );
      return "legalAgent";
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
  const agent = mastra.getAgent(agentName as any);

  if (!agent) {
    throw new Error(`Agent '${agentName}' not found in Mastra instance`);
  }

  // Convert messages to Mastra format
  const mastraMessages = convertToMastraMessages(messages);

  // Build memory configuration if provided
  const memoryConfig = options?.memory
    ? {
        thread: options.memory.thread || options?.chatId || "default-thread",
        resource: options.memory.resource || options?.userId || "default-user",
      }
    : undefined;

  if (memoryConfig) {
    logger.log("[Mastra SDK] Memory config:", memoryConfig);
  }
  logger.log("[Mastra SDK] Message count:", mastraMessages.length);

  // Stream with AI SDK v5 format
  const stream = await agent.stream(mastraMessages, {
    format: "aisdk", // AI SDK v5 format
    ...(memoryConfig && { memory: memoryConfig }),
  } as any);

  logger.log("[Mastra SDK] ✅ Stream created successfully");

  return stream;
}
