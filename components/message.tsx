"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo, useState, useMemo, useCallback } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { CitationResult } from "./citation-result";
import { useDataStream } from "./data-stream-provider";
import {
  cleanupVerboseCitations,
  convertMarkdownLinksToBadges,
  removeGeneratedReferenceSections,
} from "@/lib/citations/citation-processor";
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
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

/**
 * Source type for citation tooltips with optional legal metadata
 */
type ExtractedSource = {
  title: string;
  url: string;
  content?: string;
  legalMetadata?: {
    caseIdentifier?: string;
    court?: string;
    judge?: string;
    decisionDate?: string;
    caseYear?: string;
    documentType?: string;
    topics?: string[];
    labels?: string[];
  };
};

/**
 * Extract sources from message tool results for citation numbering and tooltips
 */
function extractSourcesFromMessage(message: ChatMessage): ExtractedSource[] {
  const sources: ExtractedSource[] = [];

  for (const part of message.parts || []) {
    const partType = (part as any).type || "";

    // Handle various tool result formats
    const isToolResult =
      partType === "tool-result" ||
      partType.startsWith("tool-") ||
      (part as any).output !== undefined;

    if (!isToolResult) continue;

    const result = (part as any).result || (part as any).output;
    if (!result) continue;

    try {
      const data = typeof result === "string" ? JSON.parse(result) : result;

      // Debug: log what we're getting
      if (typeof window !== "undefined" && partType.startsWith("tool-")) {
        console.log("[Citation Debug] Tool result:", {
          type: partType,
          hasRawResults: !!data?.rawResults,
          hasResults: !!data?.results,
          hasSources: !!data?.sources,
          dataKeys: Object.keys(data || {}),
        });
        // Log first source to see its structure
        const firstSource = data?.sources?.[0] || data?.rawResults?.[0];
        if (firstSource) {
          console.log("[Citation Debug] First source structure:", {
            hasUrl: !!firstSource.url,
            hasSourceField: !!firstSource.source,
            hasSourceFile: !!firstSource.sourceFile,
            hasMetadata: !!firstSource.metadata,
            keys: Object.keys(firstSource),
            isLegalDb: firstSource.url?.startsWith("legal-db://"),
          });
        }
      }

      // Extract from various result formats
      const allResults = [
        ...(data?.rawResults || []),
        ...(data?.results || []),
        ...(data?.sources || []),
      ];

      for (const r of allResults) {
        if (r.url) {
          sources.push({
            title: r.title || "",
            url: r.url,
            content:
              r.content?.substring(0, 200) || r.snippet?.substring(0, 200),
          });
        } else if (r.source && r.sourceFile) {
          // Legal DB source - extract rich metadata
          const metadata = r.metadata || {};

          // Debug: log metadata
          if (typeof window !== "undefined") {
            console.log("[Citation Debug] Legal DB metadata:", {
              source: r.source,
              hasMetadata: !!r.metadata,
              caseIdentifier: metadata.case_identifier,
              court: metadata.court,
            });
          }

          const caseId = metadata.case_identifier;
          const title = caseId
            ? `${caseId} (${r.source})`
            : `${r.source} - ${r.sourceFile}`.replace(/\.json$/, "");

          sources.push({
            title,
            url: `legal-db://${r.docId || metadata.doc_id || "doc"}`,
            content: r.text?.substring(0, 200),
            legalMetadata: {
              caseIdentifier: metadata.case_identifier,
              court: metadata.court,
              judge: metadata.primary_judge,
              decisionDate: metadata.decision_date,
              caseYear: metadata.case_year,
              documentType: metadata.document_type,
              topics: metadata.top_legal_topics,
              labels: metadata.labels,
            },
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

/**
 * Citation badge with hover tooltip showing source preview
 * Enhanced with rich legal metadata display
 */
function CitationBadgeWithTooltip({
  number,
  source,
}: {
  number: number;
  source?: ExtractedSource;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isLegalDb = source?.url?.startsWith("legal-db://");
  const displayDomain = isLegalDb
    ? "Legal Database"
    : source?.url
    ? new URL(source.url).hostname.replace("www.", "")
    : "";

  const legalMeta = source?.legalMetadata;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="inline-flex items-center justify-center size-6 text-xs font-semibold bg-secondary text-secondary-foreground rounded-full mx-0.5 align-middle cursor-default border-transparent">
        {number}
      </span>

      {/* Tooltip */}
      {isHovered && source && (
        <div className="absolute z-50 w-72 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-popover border border-border rounded-lg shadow-lg text-left animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Arrow */}
          <div className="absolute w-2 h-2 bg-popover border-border rotate-45 left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 border-r border-b" />

          {/* Domain */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="truncate">{displayDomain}</span>
          </div>

          {/* Title */}
          <p className="font-medium text-sm text-foreground line-clamp-2 mb-1">
            {source.title}
          </p>

          {/* Legal Metadata (for legal-db sources) */}
          {isLegalDb && legalMeta && (
            <div className="space-y-1.5 py-1.5 border-t border-border/50 mt-1.5">
              {/* Court */}
              {legalMeta.court && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-amber-600 dark:text-amber-400">⚖️</span>
                  <span className="text-foreground/80 truncate">
                    {legalMeta.court}
                  </span>
                </div>
              )}

              {/* Judge & Date */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {legalMeta.judge && (
                  <div className="flex items-center gap-1">
                    <span>👤</span>
                    <span className="truncate max-w-[100px]">
                      {legalMeta.judge}
                    </span>
                  </div>
                )}
                {legalMeta.decisionDate && (
                  <div className="flex items-center gap-1">
                    <span>📅</span>
                    <span>
                      {new Date(legalMeta.decisionDate).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Legal Topics */}
              {legalMeta.topics && legalMeta.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {legalMeta.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content preview */}
          {source.content && (
            <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5">
              {source.content}
            </p>
          )}
        </div>
      )}
    </span>
  );
}

/**
 * Response component that renders [[n]] as styled citation badges with tooltips
 * Renders markdown first, then adds interactivity via event delegation
 * Enhanced with rich legal metadata display
 */
function ResponseWithBadges({
  children,
  sources,
}: {
  children: string;
  sources: ExtractedSource[];
}) {
  const [hoveredBadge, setHoveredBadge] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Convert [[n]] to styled spans
  const processedContent = children.replace(
    /\[\[(\d+)\]\]/g,
    '<span class="cite-badge" data-cite="$1">$1</span>'
  );

  // Event delegation for badge hover
  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("cite-badge")) {
      const num = parseInt(target.dataset.cite || "0", 10);
      setHoveredBadge(num);
      const rect = target.getBoundingClientRect();
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    }
  }, []);

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("cite-badge")) {
      setHoveredBadge(null);
    }
  }, []);

  const source = hoveredBadge ? sources[hoveredBadge - 1] : null;
  const isLegalDb = source?.url?.startsWith("legal-db://");
  const legalMeta = source?.legalMetadata;
  const domain = isLegalDb
    ? "Legal Database"
    : source?.url
    ? (() => {
        try {
          return new URL(source.url).hostname.replace("www.", "");
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <div
      className={cn(
        "response-with-badges relative",
        "[&_.cite-badge]:inline-flex [&_.cite-badge]:items-center [&_.cite-badge]:justify-center",
        "[&_.cite-badge]:size-6 [&_.cite-badge]:text-xs [&_.cite-badge]:font-semibold",
        "[&_.cite-badge]:bg-secondary [&_.cite-badge]:text-secondary-foreground",
        "[&_.cite-badge]:rounded-full [&_.cite-badge]:mx-0.5 [&_.cite-badge]:align-middle",
        "[&_.cite-badge]:cursor-pointer [&_.cite-badge]:hover:bg-secondary/80"
      )}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      <Response>{processedContent}</Response>

      {hoveredBadge && source && (
        <div
          className="fixed z-50 w-72 p-3 bg-popover border border-border rounded-lg shadow-lg text-left"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-xs text-muted-foreground mb-1">{domain}</div>
          <p className="font-medium text-sm text-foreground line-clamp-2 mb-1">
            {source.title}
          </p>

          {/* Legal Metadata (for legal-db sources) */}
          {isLegalDb && legalMeta && (
            <div className="space-y-1.5 py-1.5 border-t border-border/50 mt-1.5">
              {/* Court */}
              {legalMeta.court && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-amber-600 dark:text-amber-400">⚖️</span>
                  <span className="text-foreground/80 truncate">
                    {legalMeta.court}
                  </span>
                </div>
              )}

              {/* Judge & Date */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {legalMeta.judge && (
                  <div className="flex items-center gap-1">
                    <span>👤</span>
                    <span className="truncate max-w-[100px]">
                      {legalMeta.judge}
                    </span>
                  </div>
                )}
                {legalMeta.decisionDate && (
                  <div className="flex items-center gap-1">
                    <span>📅</span>
                    <span>
                      {new Date(legalMeta.decisionDate).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Legal Topics */}
              {legalMeta.topics && legalMeta.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {legalMeta.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {source.content && (
            <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5">
              {source.content}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
          "flex-col gap-2": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <motion.div
            animate={{ opacity: isLoading ? [0.5, 1, 0.5] : 1 }}
            className="mb-2 flex px-2 md:px-0"
            transition={{
              duration: 2,
              repeat: isLoading ? Number.POSITIVE_INFINITY : 0,
              ease: "easeInOut",
            }}
          >
            <span className="font-semibold text-sm">DeepCounsel</span>
          </motion.div>
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
                // Process text for assistant messages:
                // 1. Clean up verbose inline citations
                // 2. Convert markdown links to numbered badges
                let displayText = part.text;
                if (message.role === "assistant") {
                  // Extract sources from message for numbering
                  const sources = extractSourcesFromMessage(message);

                  // Remove LLM-generated reference sections and legal-db URLs
                  displayText = removeGeneratedReferenceSections(displayText);

                  // Clean up verbose citations (also converts [n] to [[n]])
                  displayText = cleanupVerboseCitations(displayText);

                  // Then convert any remaining markdown links to numbered badges
                  if (sources.length > 0) {
                    displayText = convertMarkdownLinksToBadges(
                      displayText,
                      sources
                    );
                  }
                }

                // Don't render empty messages
                if (!displayText.trim()) {
                  return null;
                }

                // Get sources for tooltip display
                const messageSources =
                  message.role === "assistant"
                    ? extractSourcesFromMessage(message)
                    : [];

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
                      <ResponseWithBadges sources={messageSources}>
                        {sanitizeText(displayText)}
                      </ResponseWithBadges>
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

          {/* Citation Display for Assistant Messages */}
          {message.role === "assistant" && !isLoading && (
            <MessageCitations message={message} />
          )}

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

/**
 * Extract and display citations from message tool results
 * Deduplicates legal DB sources by document ID (combines chunks from same document)
 */
function MessageCitations({ message }: { message: ChatMessage }) {
  const citations = useMemo(() => {
    const webSources: any[] = [];
    const legalDbSources = new Map<string, any>(); // Key by docId to deduplicate chunks

    for (const part of message.parts || []) {
      // Check for tool results
      if ((part as any).type === "tool-result" || (part as any).output) {
        const result = (part as any).result || (part as any).output;
        if (!result) continue;

        try {
          const data = typeof result === "string" ? JSON.parse(result) : result;

          // Extract from rawResults (workflow tools - usually Tavily)
          if (data?.rawResults && Array.isArray(data.rawResults)) {
            for (const r of data.rawResults) {
              if (r.url && !r.url.startsWith("legal-db://")) {
                webSources.push({
                  title: r.title,
                  url: r.url,
                  content: r.content?.substring(0, 400),
                  relevanceScore: r.score || r.relevanceScore,
                  publishedDate: r.publishedDate || r.published_date,
                  isWeb: true,
                });
              }
            }
          }

          // Extract from results array
          if (data?.results && Array.isArray(data.results)) {
            for (const r of data.results) {
              // Legal DB format - deduplicate by docId
              if (r.source && r.sourceFile && r.text) {
                const docId = r.docId || r.sourceFile;
                const existing = legalDbSources.get(docId);

                if (existing) {
                  // Combine chunks - keep highest score, append content
                  existing.relevanceScore = Math.max(
                    existing.relevanceScore || 0,
                    r.score || 0
                  );
                  // Append content if not too long
                  if (existing.content.length < 800) {
                    existing.content +=
                      "\n\n---\n\n" + r.text?.substring(0, 300);
                  }
                  existing.chunkCount = (existing.chunkCount || 1) + 1;
                } else {
                  legalDbSources.set(docId, {
                    title: `${r.source} - ${r.sourceFile}`.replace(
                      /\.json$/,
                      ""
                    ),
                    url: `legal-db://${docId}`,
                    content: r.text?.substring(0, 400),
                    relevanceScore: r.score,
                    docId,
                    isLegalDb: true,
                    chunkCount: 1,
                  });
                }
              } else if (r.url && !r.url.startsWith("legal-db://")) {
                // Tavily format
                webSources.push({
                  title: r.title,
                  url: r.url,
                  content: r.content?.substring(0, 400),
                  relevanceScore: r.score || r.relevanceScore,
                  publishedDate: r.publishedDate || r.published_date,
                  isWeb: true,
                });
              }
            }
          }

          // Extract from sources array
          if (data?.sources && Array.isArray(data.sources)) {
            for (const s of data.sources) {
              if (s.url?.startsWith("legal-db://")) {
                const docId = s.url.replace("legal-db://", "");
                if (!legalDbSources.has(docId)) {
                  legalDbSources.set(docId, {
                    title: s.title,
                    url: s.url,
                    content: s.content?.substring(0, 400) || s.snippet,
                    relevanceScore: s.score,
                    docId,
                    isLegalDb: true,
                  });
                }
              } else if (s.url) {
                webSources.push({
                  title: s.title,
                  url: s.url,
                  content: s.content?.substring(0, 400) || s.snippet,
                  relevanceScore: s.score,
                  isWeb: true,
                });
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Deduplicate web sources by URL
    const seenUrls = new Set<string>();
    const uniqueWebSources = webSources.filter((s) => {
      if (!s.url || seenUrls.has(s.url)) return false;
      seenUrls.add(s.url);
      return true;
    });

    // Convert legal DB map to array and sort by score
    const legalDbArray = Array.from(legalDbSources.values()).sort(
      (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    // Sort web sources by score
    uniqueWebSources.sort(
      (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );

    // Combine: legal DB first (more authoritative), then web sources
    const combined = [...legalDbArray, ...uniqueWebSources];

    // Add position numbers and limit to 40
    return combined.slice(0, 40).map((s, idx) => ({
      ...s,
      position: idx + 1,
    }));
  }, [message.parts]);

  if (citations.length === 0) return null;

  return (
    <div className="mt-4 px-2 md:px-0">
      <CitationResult
        sources={citations}
        collapsible={true}
        defaultExpanded={false}
        showMetadata={true}
      />
    </div>
  );
}

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
      <div className="flex flex-col gap-2">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          className="flex px-2 md:px-0"
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <span className="font-semibold text-sm">DeepCounsel</span>
        </motion.div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="px-2 text-base text-muted-foreground md:px-0">
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
