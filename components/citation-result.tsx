"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BookOpenIcon,
  ScaleIcon,
  FileTextIcon,
  BuildingIcon,
  CheckCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CitationSource = {
  position?: number;
  id?: string;
  title: string;
  url: string;
  content?: string;
  snippet?: string;
  relevanceScore?: number;
  score?: number;
  confidence?: number;
  publishedDate?: string;
  type?: string;
};

export type CitationResultProps = {
  sources: CitationSource[];
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  showMetadata?: boolean;
};

/**
 * Get icon for citation type
 */
function getCitationIcon(type?: string) {
  switch (type) {
    case "case":
      return ScaleIcon;
    case "statute":
      return BookOpenIcon;
    case "government":
      return BuildingIcon;
    default:
      return FileTextIcon;
  }
}

/**
 * Get label for citation type
 */
function getCitationTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    case: "Case Law",
    statute: "Legislation",
    regulation: "Regulation",
    article: "Article",
    government: "Government",
    other: "Source",
  };
  return type ? labels[type] || "Source" : "Source";
}

/**
 * Infer citation type from URL
 */
function inferCitationType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("zimlii.org") || lowerUrl.includes("saflii.org")) {
    return "case";
  }
  if (lowerUrl.includes("parlzim") || lowerUrl.includes("/act/")) {
    return "statute";
  }
  if (lowerUrl.includes(".gov.")) {
    return "government";
  }
  return "other";
}

/**
 * Single citation card
 */
function CitationCard({
  source,
  index,
  expanded = false,
}: {
  source: CitationSource;
  index: number;
  expanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const type = source.type || inferCitationType(source.url);
  const Icon = getCitationIcon(type);
  const content = source.content || source.snippet || "";
  const confidence = source.confidence || source.relevanceScore || source.score;

  const confidenceColor =
    confidence !== undefined
      ? confidence >= 0.7
        ? "text-green-600 dark:text-green-400"
        : confidence >= 0.4
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-muted-foreground"
      : "text-muted-foreground";

  return (
    <div className="group flex gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <div className="flex shrink-0 items-start pt-0.5">
        <Badge
          className="flex size-6 items-center justify-center rounded-full p-0 font-semibold text-xs"
          variant="secondary"
        >
          {source.position || source.id || index + 1}
        </Badge>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {getCitationTypeLabel(type)}
          </span>
          {confidence !== undefined && (
            <span
              className={cn("text-xs flex items-center gap-1", confidenceColor)}
            >
              {confidence >= 0.7 && <CheckCircleIcon className="size-3" />}
              {Math.round(confidence * 100)}% match
            </span>
          )}
        </div>

        <a
          className="inline-flex items-center gap-1.5 font-medium text-foreground text-sm transition-colors hover:text-primary"
          href={source.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="line-clamp-2">{source.title}</span>
          <ExternalLinkIcon className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </a>

        {content && (
          <>
            <p
              className={cn(
                "text-muted-foreground text-xs leading-relaxed",
                !isExpanded && "line-clamp-2"
              )}
            >
              {content}
            </p>
            {content.length > 150 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUpIcon className="size-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="size-3" />
                    Show more
                  </>
                )}
              </button>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
          <span className="max-w-[200px] truncate">{source.url}</span>
          {source.publishedDate && source.publishedDate !== "Not available" && (
            <>
              <span>•</span>
              <span>{source.publishedDate}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Citation results list component
 */
export const CitationResult = ({
  sources,
  className,
  collapsible = false,
  defaultExpanded = true,
  showMetadata = true,
}: CitationResultProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!sources || sources.length === 0) {
    return null;
  }

  // Calculate metadata
  const verifiedCount = sources.filter((s) => {
    const conf = s.confidence || s.relevanceScore || s.score;
    return conf !== undefined && conf >= 0.7;
  }).length;

  const content = (
    <div className={cn("space-y-3", className)}>
      {sources.map((source, index) => (
        <CitationCard key={source.url || index} source={source} index={index} />
      ))}
    </div>
  );

  if (!collapsible) {
    return content;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-sm font-medium hover:text-primary transition-colors"
      >
        <BookOpenIcon className="size-4" />
        Sources ({sources.length})
        {showMetadata && verifiedCount > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            · {verifiedCount} verified
          </span>
        )}
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </span>
      </button>
      {isExpanded && <div className="mt-2">{content}</div>}
    </div>
  );
};
