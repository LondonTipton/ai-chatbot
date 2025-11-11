import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { VisibilityType } from "@/components/visibility-selector";
import { isCerebrasRateLimitError } from "@/lib/ai/cerebras-retry-handler";
import { detectQueryComplexity } from "@/lib/ai/complexity-detector";
import type { ChatModel } from "@/lib/ai/models";
import { auth } from "@/lib/appwrite/server-auth";
import { validateCitations } from "@/lib/citation-validator";
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
import { sanitizeUserInput } from "@/lib/input-sanitizer";
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

    // Extract user message text for sanitization and complexity detection
    const userMessageText =
      typeof message.parts[0] === "object" && "text" in message.parts[0]
        ? message.parts[0].text
        : "";

    // Sanitize user input on the backend as well (defense in depth)
    const sanitizationResult = sanitizeUserInput(userMessageText);

    logger.log("[chat/route] Sanitization result:", {
      originalLength: userMessageText.length,
      sanitizedLength: sanitizationResult.sanitized.length,
      isValid: sanitizationResult.isValid,
      errors: sanitizationResult.errors,
      truncated: sanitizationResult.truncated,
    });

    if (!sanitizationResult.isValid) {
      logger.error("Invalid input detected:", sanitizationResult.errors);
      return new Response(
        JSON.stringify({
          error: "invalid_input",
          message: sanitizationResult.errors[0] || "Invalid input",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Use sanitized input for processing
    if (typeof message.parts[0] === "object" && "text" in message.parts[0]) {
      message.parts[0].text = sanitizationResult.sanitized;
    }

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
      : detectQueryComplexity(sanitizationResult.sanitized);

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
        // Import and execute enhanced comprehensive workflow V2 (simplified Tavily integration)
        const { enhancedComprehensiveWorkflowV2 } = await import(
          "@/mastra/workflows/enhanced-comprehensive-workflow-v2"
        );

        logger.log(
          "[Routing] 🚀 Starting enhanced comprehensive analysis workflow V2"
        );
        logger.log(
          "[Routing] 📊 Using simplified Tavily integration (raw results to Chat Agent)"
        );

        // Get conversation history for context
        const conversationHistory = uiMessages
          .slice(0, -1) // Exclude current message
          .map((msg) => {
            const textPart = msg.parts.find((p: any) => p.type === "text");
            return {
              role: msg.role,
              content: textPart ? (textPart as any).text : "",
            };
          })
          .filter((msg) => msg.content); // Remove empty messages

        const run = await enhancedComprehensiveWorkflowV2.createRunAsync();
        const result = await run.start({
          inputData: {
            query: userMessageText,
            jurisdiction: "Zimbabwe",
            conversationHistory,
          },
        });

        logger.log(
          `[Routing] Workflow completed with status: ${result.status}`
        );

        if (result.status !== "success") {
          throw new Error(
            `Comprehensive workflow V2 failed with status: ${result.status}`
          );
        }

        // Extract output from chatAgent step
        const chatAgentStep = result.steps.chatAgent;

        if (!chatAgentStep || chatAgentStep.status !== "success") {
          throw new Error("Chat Agent step failed or not found");
        }

        const output = chatAgentStep.output as {
          response: string;
        };

        logger.log(
          "[Routing] ✅ Comprehensive workflow V2 completed successfully"
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
      // Route to Mastra using official @mastra/ai-sdk pattern with full message history
      // This uses agent.stream() with format: "aisdk" for AI SDK v5 compatibility
      logger.log(
        `[Mastra] 📜 Passing full message history (${uiMessages.length} messages)`
      );

      const { streamMastraAgentWithHistory } = await import(
        "@/lib/ai/mastra-sdk-integration"
      );

      const mastraStream = await streamMastraAgentWithHistory(
        complexityAnalysis.complexity,
        uiMessages, // ✅ FIXED: Pass full message history instead of just latest query
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
        "[Mastra] ✅ Mastra stream created with full conversation history (official @mastra/ai-sdk pattern)"
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
                for (const msg of assistantMessages) {
                  for (const part of msg.parts || []) {
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
                  }
                }
              }

              // Log all tool calls for analysis
              // NOTE: Mastra workflows use part.type = "tool-{toolName}" instead of "tool-call"
              const allToolCalls = assistantMessages.flatMap(
                (msg: any) =>
                  msg.parts
                    ?.filter(
                      (part: any) =>
                        part.type === "tool-call" ||
                        part.type?.startsWith("tool-")
                    )
                    .map((part: any) => {
                      // Extract tool name from part.toolName or part.type
                      if (part.toolName) {
                        return part.toolName;
                      }
                      if (part.type?.startsWith("tool-")) {
                        return part.type.substring(5); // Remove "tool-" prefix
                      }
                      return "unknown-tool";
                    }) || []
              );

              if (allToolCalls.length > 0) {
                logger.log(
                  `[Mastra] 🔨 Tools invoked in this interaction: ${allToolCalls.join(
                    ", "
                  )}`
                );
              }

              // 🚨 CITATION VALIDATION: Check for hallucinations before saving
              const hasToolUsage = allToolCalls.some(
                (toolName: string) =>
                  [
                    "quickFactSearch",
                    "standardResearch",
                    "deepResearch",
                    "comprehensiveResearch",
                    "multiSearch",
                    "tavilySearchAdvancedTool",
                    "advancedSearchWorkflowTool",
                  ].includes(toolName) ||
                  toolName?.toLowerCase().includes("search") ||
                  toolName?.toLowerCase().includes("research") ||
                  toolName?.toLowerCase().includes("workflow")
              );

              // Debug logging for tool detection
              if (allToolCalls.length > 0) {
                logger.log(
                  `[Validator] 🔍 Tool detection: ${allToolCalls.length} tools called, hasToolUsage=${hasToolUsage}`
                );
                logger.log(
                  `[Validator] 🔍 Tool names: ${allToolCalls.join(", ")}`
                );
              }

              const responseText =
                assistantMessages[0]?.content ||
                assistantMessages[0]?.parts
                  ?.filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join(" ") ||
                "";

              // Extract raw tool results for citation verification
              const rawToolResults: any[] = [];

              for (const msg of assistantMessages) {
                for (const part of msg.parts || []) {
                  // Check for tool results with rawResults field
                  if (part.type === "tool-result") {
                    try {
                      const result =
                        typeof part.content === "string"
                          ? JSON.parse(part.content)
                          : part.content;

                      // Extract rawResults if available
                      if (
                        result?.rawResults &&
                        Array.isArray(result.rawResults)
                      ) {
                        rawToolResults.push(...result.rawResults);
                        logger.log(
                          `[Validator] 📊 Extracted ${result.rawResults.length} raw results from ${part.toolName}`
                        );
                      }
                    } catch {
                      // Ignore parse errors
                    }
                  }
                }
              }

              logger.log(
                `[Validator] 📊 Total raw results for verification: ${rawToolResults.length}`
              );

              // Validate citations with raw tool results
              const validation = validateCitations(
                responseText,
                hasToolUsage,
                rawToolResults.length > 0 ? rawToolResults : undefined
              );

              if (!validation.isValid) {
                logger.error(
                  "[Validator] ❌ Invalid citations detected:",
                  validation.violations
                );
                logger.error(
                  `[Validator] Citation count: ${validation.citationCount}, Tool used: ${hasToolUsage}`
                );

                if (
                  validation.unverifiedCitations &&
                  validation.unverifiedCitations.length > 0
                ) {
                  logger.error(
                    `[Validator] 🚨 Unverified citations: ${validation.unverifiedCitations.join(
                      ", "
                    )}`
                  );
                }
              }

              if (validation.suspiciousPatterns.length > 0) {
                logger.warn(
                  "[Validator] ⚠️ Suspicious patterns detected:",
                  validation.suspiciousPatterns
                );
              }

              // Log verification metrics
              if (validation.sourceGroundingRate !== undefined) {
                logger.log(
                  `[Validator] 📈 Source grounding rate: ${(
                    validation.sourceGroundingRate * 100
                  ).toFixed(1)}%`
                );
                logger.log(
                  `[Validator] ✅ Verified: ${
                    validation.verifiedCitations?.length || 0
                  }, ❌ Unverified: ${
                    validation.unverifiedCitations?.length || 0
                  }`
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
    const vercelId = request.headers.get("x-vercel-id") || "unknown";

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Cerebras rate limit errors (429)
    if (isCerebrasRateLimitError(error)) {
      logger.warn("[Rate Limit] 429 error from Cerebras API", {
        statusCode: (error as any).statusCode,
        code: (error as any).code || (error as any).data?.code,
        vercelId,
      });

      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message:
            "Our AI service is experiencing high demand. Your request will be retried automatically.",
          retryAfter: 15, // seconds
          type: "rate_limit",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "15",
          },
        }
      );
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
