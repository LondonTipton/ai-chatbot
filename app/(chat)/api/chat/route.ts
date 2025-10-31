import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import type { VisibilityType } from "@/components/visibility-selector";
import { detectQueryComplexity } from "@/lib/ai/complexity-detector";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { tavilyAdvancedSearch } from "@/lib/ai/tools/tavily-advanced-search";
import { tavilyExtract } from "@/lib/ai/tools/tavily-extract";
import { tavilyQna } from "@/lib/ai/tools/tavily-qna";
import { tavilySearch } from "@/lib/ai/tools/tavily-search";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { auth } from "@/lib/appwrite/server-auth";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  createUserWithAppwriteId,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getUser,
  getUserByAppwriteId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
  updateUserAppwriteId,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import {
  getMessageSummary,
  validateResponse,
} from "@/lib/utils/validate-response";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  console.log("=".repeat(80));
  console.log("🔵 INTELLIGENT ROUTING CHAT ROUTE");
  console.log("=".repeat(80));

  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    // Extract user message text for complexity detection
    const userMessageText =
      typeof message.parts[0] === "object" && "text" in message.parts[0]
        ? message.parts[0].text
        : "";

    // Detect query complexity
    const complexityAnalysis = detectQueryComplexity(userMessageText);

    console.log(`[Routing] 💬 Chat ID: ${id}`);
    console.log(`[Routing] 🤖 Selected Model: ${selectedChatModel}`);
    console.log(
      `[Routing] 📝 Query: "${userMessageText.substring(0, 100)}..."`
    );
    console.log(`[Routing] 🎯 Complexity: ${complexityAnalysis.complexity}`);
    console.log(`[Routing] 💡 Reasoning: ${complexityAnalysis.reasoning}`);

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Verify user exists in database; if not, repair mapping via email
    let dbUser = await getUserByAppwriteId(session.user.id);
    if (!dbUser) {
      console.warn(
        `[Auth Repair] No DB user for appwriteId=${session.user.id}, attempting email fallback...`
      );
      if (session.user.email) {
        try {
          const usersByEmail = await getUser(session.user.email);
          if (usersByEmail?.[0]) {
            // Backfill missing appwriteId on existing DB user
            const updated = await updateUserAppwriteId(
              usersByEmail[0].id,
              session.user.id
            );
            dbUser = updated?.[0] || usersByEmail[0];
            console.log(
              `[Auth Repair] Linked existing user ${dbUser.id} to appwriteId=${session.user.id}`
            );
          } else {
            // Create a new DB user with appwriteId mapping
            const created = await createUserWithAppwriteId(
              session.user.email,
              session.user.id
            );
            dbUser = created?.[0];
            console.log(
              `[Auth Repair] Created DB user ${dbUser?.id} for appwriteId=${session.user.id}`
            );
          }
        } catch (e) {
          console.error(
            "[Auth Repair] Failed to resolve DB user via email:",
            e
          );
        }
      }
      if (!dbUser) {
        console.error(
          `[Auth Error] Could not resolve DB user for appwriteId=${session.user.id}`
        );
        return new ChatSDKError("unauthorized:chat").toResponse();
      }
    }

    // Check daily usage limit based on user's plan
    const { checkAndIncrementUsage } = await import("@/lib/db/usage");
    const usageCheck = await checkAndIncrementUsage(dbUser.id);

    if (!usageCheck.allowed) {
      console.log(
        `[Usage] User ${dbUser.id} exceeded daily limit: ${usageCheck.requestsToday}/${usageCheck.dailyLimit}`
      );
      return new Response(
        JSON.stringify({
          error: "daily_limit_reached",
          message: `You've reached your daily limit of ${usageCheck.dailyLimit} requests. Upgrade to continue.`,
          requestsToday: usageCheck.requestsToday,
          dailyLimit: usageCheck.dailyLimit,
          plan: usageCheck.plan,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[Usage] User ${dbUser.id} usage: ${usageCheck.requestsToday}/${usageCheck.dailyLimit} (${usageCheck.plan} plan)`
    );

    const chat = await getChatById({ id });

    if (chat) {
      if (chat.userId !== dbUser.id) {
        // Use database UUID
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: dbUser.id, // Use database UUID
        title,
        visibility: selectedVisibilityType,
      });
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    // Select tools based on complexity
    let activeTools: string[];
    let toolsConfig: any;

    if (complexityAnalysis.complexity === "simple") {
      // Simple Q&A - use QNA search
      console.log("[Routing] 🔵 Using AI SDK with QNA search (simple)");
      activeTools = ["tavilyQna", "createDocument", "updateDocument"];
      toolsConfig = {
        tavilyQna,
        createDocument,
        updateDocument,
      };
    } else if (complexityAnalysis.complexity === "light") {
      // Light research - use advanced search
      console.log("[Routing] 🔵 Using AI SDK with advanced search (light)");
      activeTools = [
        "tavilyAdvancedSearch",
        "createDocument",
        "updateDocument",
        "requestSuggestions",
      ];
      toolsConfig = {
        tavilyAdvancedSearch,
        createDocument,
        updateDocument,
        requestSuggestions,
      };
    } else {
      // Medium/Deep/Workflow - use standard tools (Mastra disabled for now)
      console.log(
        `[Routing] 🔵 Using AI SDK with standard tools (${complexityAnalysis.complexity})`
      );
      activeTools = [
        "getWeather",
        "createDocument",
        "updateDocument",
        "requestSuggestions",
        "tavilySearch",
        "tavilyExtract",
      ];
      toolsConfig = {
        getWeather,
        tavilySearch,
        tavilyExtract,
        createDocument,
        updateDocument,
        requestSuggestions,
      };
    }

    console.log(
      `[Routing] 🚀 Starting stream with model: ${selectedChatModel}`
    );
    console.log(`[Routing] 🛠️  Active tools: ${activeTools.join(", ")}`);
    console.log(`[Routing] 📊 Message count: ${uiMessages.length}`);

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Update tools with dataStream
        const updatedTools = {
          ...(toolsConfig.tavilyQna && { tavilyQna }),
          ...(toolsConfig.tavilyAdvancedSearch && { tavilyAdvancedSearch }),
          ...(toolsConfig.tavilySearch && {
            tavilySearch: tavilySearch({ dataStream }),
          }),
          ...(toolsConfig.tavilyExtract && {
            tavilyExtract: tavilyExtract({ dataStream }),
          }),
          ...(toolsConfig.createDocument && {
            createDocument: createDocument({ session, dataStream }),
          }),
          ...(toolsConfig.updateDocument && {
            updateDocument: updateDocument({ session, dataStream }),
          }),
          ...(toolsConfig.requestSuggestions && {
            requestSuggestions: requestSuggestions({ session, dataStream }),
          }),
          ...(toolsConfig.getWeather && { getWeather }),
        };

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(15), // Increased to allow text generation after tools
          maxRetries: 5,
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning" ? [] : activeTools,
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: updatedTools,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: false,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Validate response content
        const validation = validateResponse(messages);
        const summary = getMessageSummary(messages);

        if (validation.isValid) {
          console.log(`[Main Chat] ✅ Response completed: ${summary}`);
        } else {
          console.warn(
            "[Main Chat] ⚠️  Response completed but contains no meaningful content!"
          );
          console.warn(`[Main Chat] 📊 Summary: ${summary}`);

          // Log detailed structure for debugging
          const assistantMessages = messages.filter(
            (m) => m.role === "assistant"
          );
          assistantMessages.forEach((msg, idx) => {
            const partDetails = msg.parts.map(
              (p) =>
                `${p.type}${
                  p.type === "text" ? `(${p.text?.length || 0} chars)` : ""
                }`
            );
            console.warn(
              `[Main Chat] Message ${idx + 1}: ${
                msg.parts.length
              } parts - ${partDetails.join(", ")}`
            );
          });

          // CRITICAL: This is a Cerebras limitation - it stops after tool calls
          // without generating a text response. This happens when stepCountIs(5)
          // is reached during tool execution.
          console.warn(
            "[Main Chat] 🔧 This is likely due to Cerebras stopping after tool execution."
          );
          console.warn(
            "[Main Chat] 💡 Consider: 1) Increasing stepCountIs limit, 2) Using a different model for tool-heavy queries, or 3) Implementing a follow-up mechanism"
          );
        }

        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: (error) => {
        console.error("[Main Chat] ❌ Stream error:", error);

        // Handle Cerebras-specific errors with key rotation
        if (typeof window === "undefined") {
          try {
            const {
              handleCerebrasError,
              getCerebrasStats,
            } = require("@/lib/ai/cerebras-key-balancer");

            // Check if this is a Cerebras model error
            if (selectedChatModel !== "chat-model-image") {
              console.log(
                "[Main Chat] 🔄 Attempting automatic key rotation..."
              );
              handleCerebrasError(error);

              // Log current key health status
              const stats = getCerebrasStats();
              const healthyKeys = stats.filter(
                (s: any) => !s.isDisabled
              ).length;
              console.log(
                `[Main Chat] 📊 Key Health: ${healthyKeys}/${stats.length} keys available`
              );
            }
          } catch (err) {
            console.warn("[Main Chat] Could not handle Cerebras error:", err);
          }
        }

        // Provide user-friendly error messages based on error type
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();

          // Cerebras queue exceeded (429)
          if (
            errorMessage.includes("high traffic") ||
            errorMessage.includes("queue_exceeded") ||
            errorMessage.includes("queue")
          ) {
            return "Our AI service is experiencing high demand. We're automatically switching to another server. Please try again.";
          }

          // Generic rate limit (429)
          if (
            errorMessage.includes("rate limit") ||
            errorMessage.includes("429") ||
            errorMessage.includes("too many requests")
          ) {
            return "Too many requests. Our system is automatically rotating to available servers. Please wait 10-15 seconds and try again.";
          }

          // Server errors (500)
          if (
            errorMessage.includes("server error") ||
            errorMessage.includes("500")
          ) {
            return "The AI service is temporarily unavailable. Please try again in a moment.";
          }

          // Type validation errors
          if (errorMessage.includes("type validation")) {
            return "The AI service returned an unexpected response. Please try again.";
          }

          // Retry exhausted
          if (
            errorMessage.includes("failed after") &&
            errorMessage.includes("attempts")
          ) {
            return "All available AI servers are currently busy. Please wait 30-60 seconds before trying again.";
          }
        }

        return "An error occurred while processing your request. Please try again.";
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  // Get database user by Appwrite ID
  const dbUser = await getUserByAppwriteId(session.user.id);
  if (!dbUser) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== dbUser.id) {
    // Use database UUID
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
