"use client";

/**
 * Citation Tooltip Component
 *
 * Perplexity-style superscript citation markers with hover preview
 * Enhanced with rich legal case metadata display
 */

import { useState, useRef, useEffect } from "react";
import {
  ExternalLinkIcon,
  ScaleIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LegalMetadata = {
  caseIdentifier?: string;
  court?: string;
  judge?: string;
  decisionDate?: string;
  caseYear?: string;
  documentType?: string;
  topics?: string[];
  labels?: string[];
};

export type CitationSource = {
  id: string | number;
  title: string;
  url: string;
  content?: string;
  snippet?: string;
  domain?: string;
  favicon?: string;
  legalMetadata?: LegalMetadata;
};

/**
 * Format date string for display (e.g., "2020-07-28" -> "28 Jul 2020")
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

type CitationMarkerProps = {
  index: number;
  source: CitationSource;
  onSourceClick?: (source: CitationSource) => void;
};

/**
 * Superscript citation marker with hover tooltip
 */
export function CitationMarker({
  index,
  source,
  onSourceClick,
}: CitationMarkerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<"above" | "below">(
    "above"
  );
  const markerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position based on viewport
  useEffect(() => {
    if (isHovered && markerRef.current) {
      const rect = markerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const tooltipHeight = 180; // Approximate tooltip height

      setTooltipPosition(spaceAbove < tooltipHeight ? "below" : "above");
    }
  }, [isHovered]);

  const displayNumber = index + 1;
  const isLegalDb = source.url?.startsWith("legal-db://");
  const displayUrl = isLegalDb
    ? "Internal Legal Database"
    : source.url?.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

  return (
    <span className="relative inline-block">
      <button
        ref={markerRef}
        type="button"
        className={cn(
          "inline-flex items-center justify-center",
          "min-w-[1.1rem] h-[1.1rem] px-1",
          "text-[10px] font-semibold",
          "bg-blue-100 dark:bg-blue-900/40",
          "text-blue-700 dark:text-blue-300",
          "rounded-sm",
          "hover:bg-blue-200 dark:hover:bg-blue-800/60",
          "transition-colors cursor-pointer",
          "align-super -translate-y-0.5",
          "border border-blue-200 dark:border-blue-800"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSourceClick?.(source)}
        aria-label={`Citation ${displayNumber}: ${source.title}`}
      >
        {displayNumber}
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 w-72",
            "bg-popover border border-border rounded-lg shadow-lg",
            "p-3 text-left",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            tooltipPosition === "above"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : "top-full mt-2 left-1/2 -translate-x-1/2"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-popover border-border rotate-45",
              "left-1/2 -translate-x-1/2",
              tooltipPosition === "above"
                ? "bottom-0 translate-y-1/2 border-r border-b"
                : "top-0 -translate-y-1/2 border-l border-t"
            )}
          />

          {/* Content */}
          <div className="space-y-2">
            {/* Title */}
            <a
              href={isLegalDb ? undefined : source.url}
              target={isLegalDb ? undefined : "_blank"}
              rel="noopener noreferrer"
              className={cn(
                "block font-medium text-sm leading-tight",
                "text-foreground",
                !isLegalDb && "hover:text-blue-600 dark:hover:text-blue-400"
              )}
              onClick={(e) => isLegalDb && e.preventDefault()}
            >
              <span className="line-clamp-2">{source.title}</span>
              {!isLegalDb && (
                <ExternalLinkIcon className="inline-block w-3 h-3 ml-1 opacity-50" />
              )}
            </a>

            {/* Legal Case Metadata (for legal-db sources) */}
            {isLegalDb && source.legalMetadata && (
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                {/* Court */}
                {source.legalMetadata.court && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <ScaleIcon className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <span className="text-foreground/80 truncate">
                      {source.legalMetadata.court}
                    </span>
                  </div>
                )}

                {/* Judge & Date Row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {source.legalMetadata.judge && (
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[100px]">
                        {source.legalMetadata.judge}
                      </span>
                    </div>
                  )}
                  {source.legalMetadata.decisionDate && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {formatDate(source.legalMetadata.decisionDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Legal Topics */}
                {source.legalMetadata.topics &&
                  source.legalMetadata.topics.length > 0 && (
                    <div className="flex items-start gap-1.5 text-xs">
                      <TagIcon className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {source.legalMetadata.topics
                          .slice(0, 3)
                          .map((topic) => (
                            <span
                              key={topic}
                              className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px]"
                            >
                              {topic}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Domain (for non-legal sources) */}
            {!isLegalDb && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {source.favicon && (
                  <img
                    src={source.favicon}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm"
                  />
                )}
                <span className="truncate">{displayUrl}</span>
              </div>
            )}

            {/* Snippet */}
            {(source.content || source.snippet) && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {source.content || source.snippet}
              </p>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Group of citation markers (for multiple citations at same point)
 */
export function CitationGroup({
  indices,
  sources,
  onSourceClick,
}: {
  indices: number[];
  sources: CitationSource[];
  onSourceClick?: (source: CitationSource) => void;
}) {
  return (
    <span className="inline-flex gap-0.5">
      {indices.map((idx) => (
        <CitationMarker
          key={idx}
          index={idx}
          source={sources[idx]}
          onSourceClick={onSourceClick}
        />
      ))}
    </span>
  );
}
