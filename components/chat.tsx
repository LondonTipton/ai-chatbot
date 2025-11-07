"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { ChatHeader } from "@/components/chat-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useUsage } from "@/hooks/use-usage";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

const logger = createLogger("chat");

export function Chat({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
}) {
  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const { mutate } = useSWRConfig();
  const { mutate: mutateUsage } = useUsage();
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>("");
  const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState({
    requestsToday: 0,
    dailyLimit: 5,
    currentPlan: "Free",
  });
  const [currentModelId, setCurrentModelId] = useState(initialChatModel);
  const currentModelIdRef = useRef(currentModelId);
  const [comprehensiveWorkflowEnabled, setComprehensiveWorkflowEnabled] =
    useState(false);
  // Keep a ref in sync to avoid stale closure in transport.prepareSendMessagesRequest
  const comprehensiveWorkflowEnabledRef = useRef(comprehensiveWorkflowEnabled);

  useEffect(() => {
    comprehensiveWorkflowEnabledRef.current = comprehensiveWorkflowEnabled;
  }, [comprehensiveWorkflowEnabled]);

  useEffect(() => {
    currentModelIdRef.current = currentModelId;
  }, [currentModelId]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        return {
          body: {
            id: request.id,
            message: request.messages.at(-1),
            selectedChatModel: currentModelIdRef.current,
            selectedVisibilityType: visibilityType,
            // Read latest value from ref to avoid stale state
            comprehensiveWorkflowEnabled:
              comprehensiveWorkflowEnabledRef.current,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      if (dataPart.type === "data-usage") {
        setUsage(dataPart.data);
      }
    },
    onFinish: async ({ message: msg }) => {
      // Debug: Log received message
      logger.log("[Client] Message received:", msg);
      if (msg.role === "assistant") {
        const textParts = msg.parts.filter((p: any) => p.type === "text");
        const textContent = textParts.map((p: any) => p.text).join("");
        logger.log(`[Client] Assistant text length: ${textContent.length}`);
        if (textContent.length === 0) {
          logger.warn("[Client] ⚠️  Empty assistant message received!");
          logger.log("[Client] Message parts:", msg.parts);

          // Strong client-side fallback: fetch the latest messages from the server
          try {
            const res = await fetch(`/api/messages?chatId=${id}`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });
            if (res.ok) {
              const freshMessages: ChatMessage[] = await res.json();
              // The server already synthesized from tool results if needed
              setMessages(freshMessages);
              const lastAssistant = freshMessages
                .filter((m) => m.role === "assistant")
                .at(-1);
              const lastText = (lastAssistant?.parts || [])
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join("")
                .trim();
              logger.log(
                `[Client] After refresh, last assistant text length: ${lastText.length}`
              );
            } else {
              logger.warn(
                "[Client] Failed to refresh messages after empty response"
              );
            }
          } catch (e) {
            logger.warn("[Client] Error refreshing messages:", e);
          }
        }
      }
      mutate(unstable_serialize(getChatHistoryPaginationKey));

      // Immediately refresh usage counter after message is sent
      mutateUsage();
    },
    onError: (error) => {
      // Refresh usage counter on error (in case of rollback)
      mutateUsage();

      // Handle connection/socket errors
      if (
        error.message?.includes("terminated") ||
        error.message?.includes("SocketError") ||
        error.message?.includes("other side closed")
      ) {
        toast({
          type: "error",
          description:
            "Connection lost while generating response. Please try again.",
        });
        stop();
        return;
      }

      // Handle API rate limit errors (429) with retry logic
      if (
        (error as any).status === 429 ||
        (error as any).type === "rate_limit" ||
        (error as any).error === "rate_limit_exceeded"
      ) {
        const retryAfter = (error as any).retryAfter || 15;

        // Show user-friendly toast
        toast({
          type: "success",
          description: `High traffic detected. Retrying in ${retryAfter} seconds...`,
        });

        // Automatically retry after the specified delay
        setTimeout(() => {
          logger.log(`[Client] Auto-retrying after ${retryAfter}s rate limit`);

          // Re-submit the last message
          const lastUserMessage = messages.at(-1);
          if (lastUserMessage) {
            sendMessage(lastUserMessage);
          }
        }, retryAfter * 1000);

        stop();
        return;
      }

      // Prefer structured ChatSDKError
      if (error instanceof ChatSDKError) {
        // Specific handling: usage rate limit (quota exceeded)
        if (
          (error as any).type === "rate_limit" ||
          (error as any).message?.toLowerCase()?.includes("rate limit")
        ) {
          const meta = (error as any).meta || {};
          const requestsToday = Number(meta.requestsToday) || 0;
          const dailyLimit = Number(meta.dailyLimit) || 0;
          const currentPlan = String(meta.plan || "Free");
          setUpgradeModalData({ requestsToday, dailyLimit, currentPlan });
          setShowUpgradeModal(true);
          // Ensure UI leaves 'submitted' state after error
          stop();
          return;
        }

        // Gateway credit card case
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
          return;
        }

        // Default toast
        toast({ type: "error", description: error.message });
        stop();
        return;
      }

      // Fallback generic Error
      if (error instanceof Error) {
        toast({ type: "error", description: error.message });
        stop();
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/chat/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
        <ChatHeader />

        <Messages
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          regenerate={regenerate}
          selectedModelId={initialChatModel}
          setMessages={setMessages}
          status={status}
          votes={votes}
        />

        <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl flex-col gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
          {!isReadonly && (
            <MultimodalInput
              attachments={attachments}
              chatId={id}
              comprehensiveWorkflowEnabled={comprehensiveWorkflowEnabled}
              input={input}
              messages={messages}
              onComprehensiveWorkflowChange={setComprehensiveWorkflowEnabled}
              onModelChange={setCurrentModelId}
              selectedModelId={currentModelId}
              selectedVisibilityType={visibilityType}
              sendMessage={sendMessage}
              setAttachments={setAttachments}
              setInput={setInput}
              setMessages={setMessages}
              status={status}
              stop={stop}
              usage={usage}
            />
          )}
        </div>
      </div>

      <Artifact
        attachments={attachments}
        chatId={id}
        input={input}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        selectedModelId={currentModelId}
        selectedVisibilityType={visibilityType}
        sendMessage={sendMessage}
        setAttachments={setAttachments}
        setInput={setInput}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

      <UpgradeModal
        currentPlan={upgradeModalData.currentPlan}
        dailyLimit={upgradeModalData.dailyLimit}
        onOpenChange={setShowUpgradeModal}
        open={showUpgradeModal}
        requestsToday={upgradeModalData.requestsToday}
      />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
