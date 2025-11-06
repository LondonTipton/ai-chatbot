import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { VisibilityType } from "@/components/visibility-selector";
import { detectQueryComplexity } from "@/lib/ai/complexity-detector";
import { streamMastraAgent } from "@/lib/ai/mastra-sdk-integration";
import type { ChatModel } from "@/lib/ai/models";
import { auth } from "@/lib/appwrite/server-auth";
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
  updateUserAppwriteId,
} from "@/lib/db/queries";
import {
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} from "@/lib/db/usage-transaction";
import { ChatSDKError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

const logger = createLogger("chat/route");

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

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
      comprehensiveWorkflowEnabled,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
      comprehensiveWorkflowEnabled?: boolean;
    } = requestBody;

    // Extract user message text for complexity detection
    const userMessageText =
      typeof message.parts[0] === "object" && "text" in message.parts[0]
        ? message.parts[0].text
        : "";

    // Check if using simple chat model (no research)
    const useSimpleChat = selectedChatModel === "chat-model";

    // Detect query complexity
    // All queries now use Mastra (no simple/light AI SDK routes)
    const complexityAnalysis = useSimpleChat
      ? {
          complexity: "medium" as const, // Use medium (chatAgent) for simple chat
          reasoning: "Simple chat mode - using chatAgent",
          requiresResearch: false,
          requiresMultiStep: false,
          estimatedSteps: 1,
        }
      : detectQueryComplexity(userMessageText);

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

    // Route ALL queries to Mastra (no AI SDK fallback)
    if (comprehensiveWorkflowEnabled) {
      logger.log(
        "[Routing] 🔬 Using Comprehensive Analysis Workflow (user-enabled)"
      );
      logger.log("[Routing] ⚠️  High token usage: 18K-20K tokens");
      logger.log("[Routing] ⏱️  High latency: 25-47 seconds");

      // Begin usage transaction for comprehensive workflow
      const txResult = await beginTransaction(dbUser.id);

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

      try {
        // Import and execute comprehensive workflow
        const { comprehensiveAnalysisWorkflow } = await import(
          "@/mastra/workflows/comprehensive-analysis-workflow"
        );

        logger.log("[Routing] 🚀 Starting comprehensive analysis workflow");

        const run = await comprehensiveAnalysisWorkflow.createRunAsync();
        const result = await run.start({
          inputData: {
            query: userMessageText,
            jurisdiction: "Zimbabwe",
          },
        });

        logger.log(
          `[Routing] Workflow completed with status: ${result.status}`
        );

        if (result.status !== "success") {
          throw new Error(
            `Comprehensive workflow failed with status: ${result.status}`
          );
        }

        // Extract output from document step
        const documentStep = result.steps.document;

        if (!documentStep || documentStep.status !== "success") {
          throw new Error("Document step failed or not found");
        }

        const output = documentStep.output as {
          response: string;
          totalTokens: number;
          path: "enhance" | "deep-dive";
        };

        logger.log(
          `[Routing] ✅ Comprehensive workflow completed. Path: ${output.path}, Tokens: ${output.totalTokens}`
        );

        // Save assistant message
        const assistantMessageId = generateUUID();
        await saveMessages({
          messages: [
            {
              id: assistantMessageId,
              role: "assistant",
              parts: [{ type: "text", text: output.response }],
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            },
          ],
        });

        // Commit transaction
        await commitTransaction(txId);
        logger.log(`[Usage] Committed transaction ${txId}`);

        // Return simple JSON response (not streaming for comprehensive workflow)
        return Response.json({
          id: assistantMessageId,
          role: "assistant",
          content: output.response,
          totalTokens: output.totalTokens,
          path: output.path,
        });
      } catch (error) {
        logger.error("[Routing] ❌ Comprehensive workflow error:", error);

        // Rollback transaction
        await rollbackTransaction(txId);
        logger.log(`[Usage] Rolled back transaction ${txId}`);

        throw error;
      }
    }

    // Route ALL queries to Mastra (no AI SDK fallback)
    logger.log(
      `[Routing] 🤖 Using Mastra for ${complexityAnalysis.complexity} query`
    );
    logger.log(`[Routing] 📊 Message count: ${uiMessages.length}`);

    // Begin usage transaction
    const txResult = await beginTransaction(dbUser.id);

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
          agentName: useSimpleChat ? "chatAgent" : undefined, // Use simple chat agent if selected
          memory: {
            thread: id, // Use chat ID as thread
            resource: dbUser.id, // Use user ID as resource
          },
        }
      );

      logger.log(
        "[Mastra] ✅ Mastra stream created (official @mastra/ai-sdk pattern)"
      );

      // Log workflow tool capability for medium complexity
      if (complexityAnalysis.complexity === "medium") {
        logger.log(
          "[Mastra] 🔧 Chat Agent configured with advancedSearchWorkflow tool"
        );
        logger.log(
          "[Mastra] 📊 Workflow tool will be invoked if research is needed"
        );
      }

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
              // Log if workflow tool was used (check for tool calls in messages)
              const hasToolCalls = assistantMessages.some((msg: any) =>
                msg.parts?.some(
                  (part: any) =>
                    part.type === "tool-call" &&
                    part.toolName === "advancedSearchWorkflow"
                )
              );

              if (hasToolCalls) {
                logger.log(
                  "[Mastra] 🔧 Workflow tool 'advancedSearchWorkflow' was invoked during this interaction"
                );
              }

              // Log createDocument tool invocations
              const hasCreateDocumentCalls = assistantMessages.some(
                (msg: any) =>
                  msg.parts?.some(
                    (part: any) =>
                      part.type === "tool-call" &&
                      part.toolName === "createDocument"
                  )
              );

              if (hasCreateDocumentCalls) {
                logger.log(
                  "[Mastra] 📄 Document creation tool 'createDocument' was successfully invoked"
                );

                // Extract createDocument tool results to log document details
                assistantMessages.forEach((msg: any) => {
                  msg.parts?.forEach((part: any) => {
                    if (
                      part.type === "tool-call" &&
                      part.toolName === "createDocument"
                    ) {
                      logger.log(
                        `[Mastra] 📝 Document created: "${part.args?.title}" (kind: ${part.args?.kind})`
                      );
                    }
                    if (
                      part.type === "tool-result" &&
                      part.toolName === "createDocument"
                    ) {
                      try {
                        const result =
                          typeof part.content === "string"
                            ? JSON.parse(part.content)
                            : part.content;
                        logger.log(
                          `[Mastra] ✅ Document creation result: ID=${result.id}, Title="${result.title}"`
                        );
                      } catch (_) {
                        logger.log(
                          "[Mastra] ✅ Document creation completed successfully"
                        );
                      }
                    }
                  });
                });
              }

              // Log all tool calls for analysis
              const allToolCalls = assistantMessages.flatMap(
                (msg: any) =>
                  msg.parts
                    ?.filter((part: any) => part.type === "tool-call")
                    .map((part: any) => part.toolName) || []
              );
              if (allToolCalls.length > 0) {
                logger.log(
                  `[Mastra] 🔨 Tools invoked in this interaction: ${allToolCalls.join(
                    ", "
                  )}`
                );
              }

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

              logger.log("[Mastra] ✅ Assistant message saved successfully");
            }

            // Commit transaction on success
            await commitTransaction(txId);
            logger.log(`[Usage] Committed transaction ${txId}`);
          } catch (err) {
            logger.error("[Mastra] ❌ Failed to save assistant message:", err);
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
        logger.error(`[Usage] Failed to rollback transaction ${txId}:`, err);
      }

      // Re-throw error to be caught by outer error handler
      throw error;
    }
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
