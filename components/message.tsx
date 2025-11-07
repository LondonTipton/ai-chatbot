"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
// CITATION SYSTEM IMPORTS - Uncomment when enabling citation system
// import {
//   CheckCircleIcon,
//   ChevronDownIcon,
//   ClockIcon,
//   WrenchIcon,
// } from "lucide-react";
import { memo, useState } from "react";
// import { Badge } from "@/components/ui/badge";
// import { CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
// import { CitationResult } from "./citation-result";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
      initial={{ opacity: 0 }}
    >
      <div
        className={cn("flex w-full", {
          "flex-row items-start justify-end gap-2 md:gap-3":
            message.role === "user" && mode !== "edit",
          "flex-col gap-2 md:flex-row md:items-start md:gap-3":
            message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <>
            {/* Mobile: Animated text - fades in/out while streaming */}
            <motion.div
              animate={{ opacity: isLoading ? [0.5, 1, 0.5] : 1 }}
              className="flex px-2 md:hidden"
              transition={{
                duration: 2,
                repeat: isLoading ? Number.POSITIVE_INFINITY : 0,
                ease: "easeInOut",
              }}
            >
              <span className="font-semibold text-sm">DeepCounsel</span>
            </motion.div>
            {/* Desktop: Icon only */}
            <div className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border md:flex">
              <SparklesIcon size={14} />
            </div>
          </>
        )}

        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "min-h-96": message.role === "assistant" && requiresScrollPadding,
            "w-full":
              (message.role === "assistant" &&
                message.parts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                )) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning" && part.text?.trim().length > 0) {
              return (
                <MessageReasoning
                  isLoading={isLoading}
                  key={key}
                  reasoning={part.text}
                />
              );
            }

            if (type === "text") {
              if (mode === "view") {
                // Temporarily disable thinking tokens filter for debugging
                const displayText = part.text;

                // Don't render empty messages
                if (!displayText.trim()) {
                  return null;
                }

                return (
                  <div key={key}>
                    <MessageContent
                      className={cn("text-base", {
                        "w-fit break-words rounded-2xl px-3 py-2 text-right text-white":
                          message.role === "user",
                        "overflow-x-auto bg-transparent px-2 py-0 text-left md:px-0":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                      style={
                        message.role === "user"
                          ? { backgroundColor: "#006cff" }
                          : undefined
                      }
                    >
                      <Response>{sanitizeText(displayText)}</Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-getWeather") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-getWeather" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={<Weather weatherAtLocation={part.output} />}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <DocumentPreview
                  isReadonly={isReadonly}
                  key={toolCallId}
                  result={part.output}
                />
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part;

              if (part.output && "error" in part.output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String(part.output.error)}
                  </div>
                );
              }

              return (
                <div className="relative" key={toolCallId}>
                  <DocumentPreview
                    args={{ ...part.output, isUpdate: true }}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                </div>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId, state } = part;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-requestSuggestions" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={
                          "error" in part.output ? (
                            <div className="rounded border p-2 text-red-500">
                              Error: {String(part.output.error)}
                            </div>
                          ) : (
                            <DocumentToolResult
                              isReadonly={isReadonly}
                              result={part.output}
                              type="request-suggestions"
                            />
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            // CITATION SYSTEM - Commented out due to Cerebras tool continuation issue
            // The citation system is fully implemented and working. Uncomment to enable.
            // See CEREBRAS_TOOL_LIMITATION.md for details.
            /*
            if (type === "tool-tavilySearch") {
              const { toolCallId, state } = part;

              const sourceCount =
                state === "output-available" && part.output?.results
                  ? part.output.results.length
                  : 0;

              return (
                <Tool defaultOpen={false} key={toolCallId}>
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full min-w-0 items-center justify-between gap-2 p-3"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium text-sm">
                        Web Search
                        {sourceCount > 0 && (
                          <span className="ml-2 text-muted-foreground">
                            ({sourceCount} source{sourceCount !== 1 ? "s" : ""})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {state === "output-available" && (
                        <Badge
                          className="flex items-center gap-1 rounded-full text-xs"
                          variant="secondary"
                        >
                          <CheckCircleIcon className="size-4 text-green-600" />
                          <span>Completed</span>
                        </Badge>
                      )}
                      {state === "input-available" && (
                        <Badge
                          className="flex items-center gap-1 rounded-full text-xs"
                          variant="secondary"
                        >
                          <ClockIcon className="size-4 animate-pulse" />
                          <span>Running</span>
                        </Badge>
                      )}
                      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                  </CollapsibleTrigger>
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={part.input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={
                          part.output?.error
                            ? String(part.output.error)
                            : undefined
                        }
                        output={
                          part.output?.results &&
                          part.output.results.length > 0 ? (
                            <CitationResult sources={part.output.results} />
                          ) : (
                            <div className="p-2 text-muted-foreground text-sm">
                              {part.output?.answer || "No results found"}
                            </div>
                          )
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }
            */

            return null;
          })}

          {!isReadonly && (
            <MessageActions
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.message.id !== nextProps.message.id) {
      return false;
    }
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) {
      return false;
    }
    if (!equal(prevProps.message.parts, nextProps.message.parts)) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }

    return false;
  }
);

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role={role}
      data-testid="message-assistant-loading"
      initial={{ opacity: 0 }}
    >
      <div className="flex flex-col gap-2 px-2 md:flex-row md:items-start md:gap-3 md:px-0">
        {/* Mobile: Text only with CSS fade animation */}
        <div className="flex md:hidden">
          <span className="animate-pulse font-semibold text-sm">
            DeepCounsel
          </span>
        </div>
        {/* Desktop: Icon only */}
        <div className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border md:flex">
          <SparklesIcon size={14} />
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="text-base text-muted-foreground">
            <LoadingText>Thinking...</LoadingText>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LoadingText = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      animate={{ backgroundPosition: ["100% 50%", "-100% 50%"] }}
      className="flex items-center text-transparent"
      style={{
        background:
          "linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground)) 35%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) 65%, hsl(var(--muted-foreground)) 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      }}
      transition={{
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    >
      {children}
    </motion.div>
  );
};
