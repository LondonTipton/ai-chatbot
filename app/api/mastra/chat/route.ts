/**
 * Mastra Chat API Route
 *
 * Official @mastra/ai-sdk integration using chatRoute() pattern
 * This demonstrates the recommended way to integrate Mastra with AI SDK v5
 *
 * Usage from frontend:
 * ```typescript
 * const { messages, sendMessage } = useChat({
 *   transport: new DefaultChatTransport({
 *     api: '/api/mastra/chat',
 *   }),
 * });
 * ```
 */

import { createLogger } from "@/lib/logger";
import { mastra } from "@/mastra";

const logger = createLogger("api/mastra/chat");

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { messages, agent = "legalAgent", memory } = await req.json();

    logger.log("[Mastra Chat] Incoming request", {
      agent,
      messageCount: messages?.length,
      hasMemory: !!memory,
    });

    // Get the specified agent
    const mastraAgent = mastra.getAgent(agent);

    if (!mastraAgent) {
      logger.error(`[Mastra Chat] Agent not found: ${agent}`);
      return Response.json(
        { error: `Agent '${agent}' not found` },
        { status: 404 }
      );
    }

    // Stream the agent response with AI SDK v5 format
    const stream = await mastraAgent.stream(messages, {
      format: "aisdk",
      ...(memory && { memory }),
    } as any);

    logger.log("[Mastra Chat] Stream created successfully");

    // Use AI SDK v5's native toUIMessageStreamResponse()
    return stream.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("[Mastra Chat] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
