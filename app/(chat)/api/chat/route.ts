import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
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
import {
  detectQueryComplexity,
  shouldUseMastra,
} from "@/lib/ai/complexity-detector";
import { streamMastraAgent } from "@/lib/ai/mastra-sdk-integration";
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
import {
  commitTransaction,
  rollbackTransaction,
} from "@/lib/db/usage-transaction";
import { ChatSDKError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

const logger = createLogger("chat/route");

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      logger.warn(
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
        logger.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        logger.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  logger.log("=".repeat(80));
  logger.log("🔵 INTELLIGENT ROUTING CHAT ROUTE");
  logger.log("=".repeat(80));

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

    logger.log(`[Routing] 💬 Chat ID: ${id}`);
    logger.log(`[Routing] 🤖 Selected Model: ${selectedChatModel}`);
    logger.log(`[Routing] 📝 Query: "${userMessageText.substring(0, 100)}..."`);
    logger.log(`[Routing] 🎯 Complexity: ${complexityAnalysis.complexity}`);
    logger.log(`[Routing] 💡 Reasoning: ${complexityAnalysis.reasoning}`);

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // Verify user exists in database; if not, repair mapping via email
    let dbUser = await getUserByAppwriteId(session.user.id);
    if (!dbUser) {
      logger.warn(
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
            logger.log(
              `[Auth Repair] Linked existing user ${dbUser.id} to appwriteId=${session.user.id}`
            );
          } else {
            // Create a new DB user with appwriteId mapping
            const created = await createUserWithAppwriteId(
              session.user.email,
              session.user.id
            );
            dbUser = created?.[0];
            logger.log(
              `[Auth Repair] Created DB user ${dbUser?.id} for appwriteId=${session.user.id}`
            );
          }
        } catch (e) {
          logger.error("[Auth Repair] Failed to resolve DB user via email:", e);
        }
      }
      if (!dbUser) {
        logger.error(
          `[Auth Error] Could not resolve DB user for appwriteId=${session.user.id}`
        );
        return new ChatSDKError("unauthorized:chat").toResponse();
      }
    }

    // Check chat ownership before creating transaction (non-retryable error)
    const chat = await getChatById({ id });

    if (chat && chat.userId !== dbUser.id) {
      // Use database UUID
      return new ChatSDKError("forbidden:chat").toResponse();
    }

    // Create chat if it doesn't exist
    if (!chat) {
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

    // Check if query should use Mastra
    let shouldFallbackToAiSdk = false;

    if (shouldUseMastra(complexityAnalysis.complexity)) {
      logger.log(
        `[Routing] 🤖 Using Mastra for ${complexityAnalysis.complexity} query`
      );
      logger.log(`[Routing] 📊 Message count: ${uiMessages.length}`);

      // Begin usage transaction for Mastra
      const { beginTransaction: beginMastraTx } = await import(
        "@/lib/db/usage-transaction"
      );
      const txResult = await beginMastraTx(dbUser.id);

      if (!txResult.allowed) {
        logger.log(
          `[Usage] User ${dbUser.id} exceeded daily limit: ${txResult.currentUsage.requestsToday}/${txResult.currentUsage.dailyLimit}`
        );
        return Response.json(
          {
            code: "rate_limit:chat",
            message: `You've reached your daily limit of ${txResult.currentUsage.dailyLimit} requests. Upgrade to continue.`,
            cause: "daily_limit_reached",
            requestsToday: txResult.currentUsage.requestsToday,
            dailyLimit: txResult.currentUsage.dailyLimit,
            plan: txResult.currentUsage.plan,
          },
          { status: 429 }
        );
      }

      const txId = txResult.transaction?.transactionId;
      if (txId) {
        logger.log(
          `[Usage] User ${dbUser.id} usage: ${txResult.currentUsage.requestsToday}/${txResult.currentUsage.dailyLimit} (${txResult.currentUsage.plan} plan)`
        );
        logger.log(`[Usage] Created transaction ${txId}`);

        try {
          // Route to Mastra using official @mastra/ai-sdk pattern
          // This uses agent.stream() with format: "aisdk" for AI SDK v5 compatibility
          const mastraStream = await streamMastraAgent(
            complexityAnalysis.complexity,
            userMessageText,
            {
              userId: dbUser.id,
              chatId: id,
              sessionId: session.user.id,
              memory: {
                thread: id, // Use chat ID as thread
                resource: dbUser.id, // Use user ID as resource
              },
            }
          );

          logger.log(
            "[Mastra] ✅ Mastra stream created (official @mastra/ai-sdk pattern)"
          );

          // Use AI SDK v5's native toUIMessageStreamResponse()
          // This is the official pattern from @mastra/ai-sdk documentation
          const response = mastraStream.toUIMessageStreamResponse({
            onFinish: async ({ messages }: { messages: any[] }) => {
              // Save assistant messages to database
              try {
                logger.log("[Mastra] 💾 Saving assistant message to database", {
                  messageCount: messages.length,
                });

                const assistantMessages = messages.filter(
                  (msg: any) => msg.role === "assistant"
                );

                if (assistantMessages.length > 0) {
                  await saveMessages({
                    messages: assistantMessages.map((currentMessage: any) => ({
                      id: currentMessage.id,
                      role: currentMessage.role,
                      parts: currentMessage.parts,
                      createdAt: new Date(),
                      attachments: [],
                      chatId: id,
                    })),
                  });

                  logger.log(
                    "[Mastra] ✅ Assistant message saved successfully"
                  );
                }

                // Commit transaction on success
                await commitTransaction(txId);
                logger.log(`[Usage] Committed transaction ${txId}`);
              } catch (err) {
                logger.error(
                  "[Mastra] ❌ Failed to save assistant message:",
                  err
                );
                // Rollback transaction on error
                await rollbackTransaction(txId);
                logger.log(
                  `[Usage] Rolled back transaction ${txId} due to save error`
                );
              }
            },
            onError: async ({ error }: { error: Error | string }) => {
              logger.error("[Mastra] ❌ Stream error:", error);
              // Rollback transaction on error
              try {
                await rollbackTransaction(txId);
                logger.log(
                  `[Usage] Rolled back transaction ${txId} due to stream error`
                );
              } catch (err) {
                logger.error(
                  `[Usage] Failed to rollback transaction ${txId}:`,
                  err
                );
              }
            },
          });

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error("[Mastra] ❌ Mastra routing failed:", {
            error: errorMessage,
            complexity: complexityAnalysis.complexity,
            stack: error instanceof Error ? error.stack : undefined,
          });

          // Rollback transaction on error
          try {
            await rollbackTransaction(txId);
            logger.log(
              `[Usage] Rolled back transaction ${txId} after Mastra failure`
            );
          } catch (err) {
            logger.error(
              `[Usage] Failed to rollback transaction ${txId}:`,
              err
            );
          }

          // Set flag to fallback to AI SDK
          shouldFallbackToAiSdk = true;
          logger.log("[Routing] 🔄 Falling back to AI SDK due to Mastra error");
        }
      }
    }

    // AI SDK flow for simple/light queries or Mastra fallback
    if (shouldFallbackToAiSdk) {
      logger.log(
        `[Routing] 🔄 Using AI SDK as fallback for ${complexityAnalysis.complexity} query`
      );
    } else {
      logger.log(
        `[Routing] ⚡ Using AI SDK for ${complexityAnalysis.complexity} query`
      );
    }

    // Select tools based on complexity
    let activeTools: string[];
    let toolsConfig: any;

    if (complexityAnalysis.complexity === "simple") {
      // Simple Q&A - use QNA search
      logger.log("[Routing] 🔵 Using AI SDK with QNA search (simple)");
      activeTools = ["tavilyQna", "createDocument", "updateDocument"];
      toolsConfig = {
        tavilyQna,
        createDocument,
        updateDocument,
      };
    } else if (complexityAnalysis.complexity === "light") {
      // Light research - use advanced search
      logger.log("[Routing] 🔵 Using AI SDK with advanced search (light)");
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
      // Medium/Deep/Workflow - use standard tools (fallback from Mastra)
      logger.log(
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

    logger.log(`[Routing] 🚀 Starting stream with model: ${selectedChatModel}`);
    logger.log(`[Routing] 🛠️  Active tools: ${activeTools.join(", ")}`);
    logger.log(`[Routing] 📊 Message count: ${uiMessages.length}`);

    // Begin usage transaction for AI SDK flow
    const { beginTransaction: beginAiSdkTx } = await import(
      "@/lib/db/usage-transaction"
    );
    const txResult = await beginAiSdkTx(dbUser.id);

    if (!txResult.allowed) {
      logger.log(
        `[Usage] User ${dbUser.id} exceeded daily limit: ${txResult.currentUsage.requestsToday}/${txResult.currentUsage.dailyLimit}`
      );
      return Response.json(
        {
          code: "rate_limit:chat",
          message: `You've reached your daily limit of ${txResult.currentUsage.dailyLimit} requests. Upgrade to continue.`,
          cause: "daily_limit_reached",
          requestsToday: txResult.currentUsage.requestsToday,
          dailyLimit: txResult.currentUsage.dailyLimit,
          plan: txResult.currentUsage.plan,
        },
        { status: 429 }
      );
    }

    const txId = txResult.transaction?.transactionId;
    if (!txId) {
      throw new Error("Transaction ID not found");
    }
    logger.log(
      `[Usage] User ${dbUser.id} usage: ${txResult.currentUsage.requestsToday}/${txResult.currentUsage.dailyLimit} (${txResult.currentUsage.plan} plan)`
    );
    logger.log(`[Usage] Created transaction ${txId}`);

    // Create stream without retry orchestration (legacy flow)
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Update tools with dataStream
        const updatedTools = {
          ...(toolsConfig.tavilyQna && { tavilyQna }),
          ...(toolsConfig.tavilyAdvancedSearch && {
            tavilyAdvancedSearch,
          }),
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

        logger.log(
          `[Routing] 🔧 Registered tools: ${Object.keys(updatedTools).join(
            ", "
          )}`
        );
        logger.log(
          `[Routing] 🎯 Active tools filter: ${activeTools.join(", ")}`
        );

        // Enforce reasoning for all Cerebras models to help debug empty responses
        const isCerebrasModel = selectedChatModel !== "chat-model-image";
        logger.log(
          `[Routing] 🧠 Model: ${selectedChatModel}, isCerebras: ${isCerebrasModel}, reasoning enforced: ${isCerebrasModel}`
        );

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
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
              finalMergedUsage = {
                ...usage,
                ...summary,
                modelId,
              } as AppUsage;
              dataStream.write({
                type: "data-usage",
                data: finalMergedUsage,
              });
            } catch (err) {
              logger.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({
                type: "data-usage",
                data: finalMergedUsage,
              });
            }
          },
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: isCerebrasModel, // Send reasoning for Cerebras models to help debug
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Ensure all assistant messages have text content
        const { postProcessAssistantResponse } = await import(
          "@/lib/ai/post-processing"
        );
        const { changed } = await postProcessAssistantResponse(
          messages as any,
          {
            activeTools,
            userQueryText: userMessageText,
          }
        );
        if (changed) {
          logger.log("[AI SDK] ✅ Post-processing produced assistant text");
        }

        // Save messages (no validation in legacy flow)
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
            logger.warn("Unable to persist last usage for chat", id, err);
          }
        }

        // Commit usage transaction for legacy flow
        try {
          await commitTransaction(txId);
          logger.log(`[Usage] Committed transaction ${txId}`);
        } catch (err) {
          logger.error(`[Usage] Failed to commit transaction ${txId}:`, err);
        }
      },
      onError: (error) => {
        logger.error("[Stream] ❌ Stream error:", error);

        // Rollback usage transaction for legacy flow (fire and forget)
        rollbackTransaction(txId)
          .then(() => logger.log(`[Usage] Rolled back transaction ${txId}`))
          .catch((err: Error) =>
            logger.error(`[Usage] Failed to rollback transaction ${txId}:`, err)
          );

        // Handle Cerebras-specific errors with key rotation
        if (typeof window === "undefined") {
          try {
            const {
              handleCerebrasError,
              getCerebrasStats,
            } = require("@/lib/ai/cerebras-key-balancer");

            // Check if this is a Cerebras model error
            if (selectedChatModel !== "chat-model-image") {
              logger.log("[Stream] 🔄 Attempting automatic key rotation...");
              handleCerebrasError(error);

              // Log current key health status
              const stats = getCerebrasStats();
              const healthyKeys = stats.filter(
                (s: any) => !s.isDisabled
              ).length;
              logger.log(
                `[Stream] 📊 Key Health: ${healthyKeys}/${stats.length} keys available`
              );
            }
          } catch (err) {
            logger.warn("[Stream] Could not handle Cerebras error:", err);
          }
        }

        return "Stream error occurred";
      },
    });

    // Return the stream (legacy flow)
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

    logger.error("Unhandled error in chat API:", error, { vercelId });
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
