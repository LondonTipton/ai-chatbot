"use client";

/**
 * Citation Components
 *
 * UI components for displaying source citations in chat messages
 */

import { useState } from "react";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  FileText,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Citation = {
  id: string;
  marker: string;
  title: string;
  url: string;
  snippet: string;
  type: string;
  confidence: number;
};

type CitationMetadata = {
  totalCitations: number;
  verifiedCount: number;
  averageConfidence: number;
};

/**
 * Get icon for citation type
 */
function getCitationIcon(type: string) {
  switch (type) {
    case "case":
      return Scale;
    case "statute":
      return BookOpen;
    case "government":
      return Building;
    default:
      return FileText;
  }
}

/**
 * Get label for citation type
 */
function getCitationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    case: "Case Law",
    statute: "Legislation",
    regulation: "Regulation",
    article: "Article",
    government: "Government",
    other: "Source",
  };
  return labels[type] || "Source";
}

/**
 * Inline citation marker component
 */
export function CitationMarker({
  marker,
  citation,
  onClick,
}: {
  marker: string;
  citation?: Citation;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center",
        "text-xs font-medium",
        "px-1 py-0.5 rounded",
        "bg-blue-100 dark:bg-blue-900/30",
        "text-blue-700 dark:text-blue-300",
        "hover:bg-blue-200 dark:hover:bg-blue-800/50",
        "transition-colors cursor-pointer",
        "align-super"
      )}
      title={citation?.title}
    >
      {marker}
    </button>
  );
}

/**
 * Single citation card component
 */
export function CitationCard({
  citation,
  expanded = false,
}: {
  citation: Citation;
  expanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const Icon = getCitationIcon(citation.type);

  const confidenceColor =
    citation.confidence >= 0.7
      ? "text-green-600 dark:text-green-400"
      : citation.confidence >= 0.4
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div
      className={cn(
        "border rounded-lg p-3",
        "bg-muted/30 dark:bg-muted/10",
        "border-border/50"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full",
            "bg-blue-100 dark:bg-blue-900/30",
            "text-blue-700 dark:text-blue-300",
            "flex items-center justify-center text-xs font-medium"
          )}
        >
          {citation.id}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              {getCitationTypeLabel(citation.type)}
            </span>
            <span className={cn("text-xs", confidenceColor)}>
              {Math.round(citation.confidence * 100)}% match
            </span>
          </div>

          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-sm font-medium",
              "text-foreground hover:text-blue-600 dark:hover:text-blue-400",
              "line-clamp-2 block"
            )}
          >
            {citation.title}
            <ExternalLink className="inline-block w-3 h-3 ml-1 opacity-50" />
          </a>

          {citation.snippet && (
            <>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "flex items-center gap-1 mt-2",
                  "text-xs text-muted-foreground",
                  "hover:text-foreground transition-colors"
                )}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Hide excerpt
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Show excerpt
                  </>
                )}
              </button>

              {isExpanded && (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {citation.snippet}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Citations list component
 */
export function CitationsList({
  citations,
  metadata,
  collapsible = true,
  defaultExpanded = false,
}: {
  citations: Citation[];
  metadata?: CitationMetadata | null;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (citations.length === 0) return null;

  const content = (
    <div className="space-y-2">
      {citations.map((citation) => (
        <CitationCard key={citation.id} citation={citation} />
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="mt-4 pt-4 border-t border-border/50">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Sources ({citations.length})
          {metadata && (
            <span className="text-xs text-muted-foreground font-normal">
              · {metadata.verifiedCount} verified
            </span>
          )}
        </h4>
        {content}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 w-full",
          "text-sm font-medium",
          "hover:text-blue-600 dark:hover:text-blue-400",
          "transition-colors"
        )}
      >
        <BookOpen className="w-4 h-4" />
        Sources ({citations.length})
        {metadata && (
          <span className="text-xs text-muted-foreground font-normal">
            · {metadata.verifiedCount} verified
          </span>
        )}
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      {isExpanded && <div className="mt-3">{content}</div>}
    </div>
  );
}

/**
 * Compact inline citations display
 */
export function InlineCitations({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {citations.map((citation) => (
        <a
          key={citation.id}
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1",
            "text-xs px-2 py-1 rounded-full",
            "bg-muted/50 hover:bg-muted",
            "text-muted-foreground hover:text-foreground",
            "transition-colors"
          )}
          title={citation.title}
        >
          <span className="font-medium">{citation.marker}</span>
          <span className="max-w-[150px] truncate">{citation.title}</span>
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      ))}
    </div>
  );
}
