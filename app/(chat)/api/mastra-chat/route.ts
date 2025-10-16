/**
 * Mastra-based Chat Route
 * Uses intelligent routing with Cerebras general purpose agent
 */

import { geolocation } from "@vercel/functions";
import type { Message } from "ai";
import { auth } from "@/app/(auth)/auth";
import { IntelligentRouter } from "@/lib/agents/intelligent-router";
import {
  getChatById,
  getUserById,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { PostgresMemoryService } from "@/lib/services/postgres-memory-service";
import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

const memoryService = new PostgresMemoryService();

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { id, messages, selectedVisibilityType } = body;

    const session = await auth();
    const isGuest = !session?.user;

    // For registered users, verify they exist
    if (!isGuest) {
      const userExists = await getUserById(session.user.id);
      if (!userExists) {
        console.error(
          `[Auth Error] User ID ${session.user.id} not found in database`
        );
        return new ChatSDKError("unauthorized:chat").toResponse();
      }
    }

    // Get or create chat
    const chat = await getChatById({ id });

    if (chat) {
      if (!isGuest && chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else if (!isGuest) {
      const lastMessage = messages[messages.length - 1];
      const title = await generateTitleFromUserMessage({
        message: lastMessage,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType || "private",
      });
    }

    // Load user context for registered users
    let userContext;
    if (!isGuest) {
      userContext = {
        contextString: await memoryService.getPersonalizedContext(
          session.user.id
        ),
        preferences: await memoryService.getUserPreferences(session.user.id),
      };
    }

    // Get geolocation hints
    const { longitude, latitude, city, country } = geolocation(request);
    const locationContext = `\nUser location: ${city}, ${country}`;

    // Add location context to messages if available
    const enhancedMessages: Message[] = messages.map(
      (msg: Message, index: number) => {
        if (index === 0 && msg.role === "system") {
          return {
            ...msg,
            content: msg.content + locationContext,
          };
        }
        return msg;
      }
    );

    // Process through intelligent router
    const result = await IntelligentRouter.processQuery({
      messages: enhancedMessages,
      userId: session?.user?.id,
      sessionId: id,
      isGuest,
      userContext,
    });

    // Track interaction for registered users
    if (!isGuest && session?.user?.id) {
      const lastMessage = messages[messages.length - 1];
      await memoryService.trackInteraction({
        userId: session.user.id,
        sessionId: id,
        query: lastMessage?.content || "",
        queryType: result.escalationType || "general",
        complexity: result.escalated ? "complex" : "simple",
        agentUsed: result.agentUsed,
        agentResponse: result.response.text,
        responseTime: Date.now() - startTime,
        wasEscalated: result.escalated,
        escalatedFrom: result.escalatedFrom,
      });
    }

    // Save messages to database
    if (!isGuest) {
      const lastUserMessage = messages[messages.length - 1];
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: lastUserMessage.id,
            role: "user",
            parts: [{ type: "text", text: lastUserMessage.content }],
            attachments: [],
            createdAt: new Date(),
          },
          {
            chatId: id,
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [{ type: "text", text: result.response.text }],
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    // Return streaming response
    return new Response(
      JSON.stringify({
        text: result.response.text,
        agentUsed: result.agentUsed,
        escalated: result.escalated,
        guestMode: result.guestMode,
        upgradePrompt: result.upgradePrompt,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Used": result.agentUsed,
          "X-Escalated": result.escalated.toString(),
          "X-Guest-Mode": result.guestMode.toString(),
          "X-Upgrade-Prompt": result.upgradePrompt?.toString() || "false",
          "X-Specialist-Needed": result.specialistNeeded || "",
        },
      }
    );
  } catch (error) {
    console.error("Mastra chat error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError("offline:chat").toResponse();
  }
}
