"use client";

/**
 * Cited Text Component
 *
 * Renders text with Perplexity-style superscript citation markers
 * that show tooltips on hover
 */

import { useMemo, Fragment } from "react";
import { CitationMarker, type CitationSource } from "./citation-tooltip";

type CitedTextProps = {
  text: string;
  sources: CitationSource[];
  onSourceClick?: (source: CitationSource) => void;
  className?: string;
};

/**
 * Parse text and extract citation markers
 */
function parseTextWithCitations(
  text: string
): Array<{ type: "text" | "citation"; content: string; index?: number }> {
  const parts: Array<{
    type: "text" | "citation";
    content: string;
    index?: number;
  }> = [];

  // Match <sup data-cite="X">[Y]</sup> markers
  const citationRegex = /<sup data-cite="(\d+)">\[(\d+)\]<\/sup>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add citation marker
    parts.push({
      type: "citation",
      content: match[2], // Display number
      index: Number.parseInt(match[1], 10), // Source index
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * Render text with interactive citation markers
 */
export function CitedText({
  text,
  sources,
  onSourceClick,
  className,
}: CitedTextProps) {
  const parts = useMemo(() => parseTextWithCitations(text), [text]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <Fragment key={i}>{part.content}</Fragment>;
        }

        if (part.type === "citation" && part.index !== undefined) {
          const source = sources[part.index];
          if (!source) {
            return (
              <sup key={i} className="text-muted-foreground">
                [{part.content}]
              </sup>
            );
          }

          return (
            <CitationMarker
              key={i}
              index={part.index}
              source={source}
              onSourceClick={onSourceClick}
            />
          );
        }

        return null;
      })}
    </span>
  );
}

/**
 * Process raw AI text and render with citations
 * This handles the full pipeline: extract citations -> render with markers
 */
export function ProcessedCitedText({
  rawText,
  sources,
  onSourceClick,
  className,
}: {
  rawText: string;
  sources: CitationSource[];
  onSourceClick?: (source: CitationSource) => void;
  className?: string;
}) {
  const { processedText, mappedSources } = useMemo(() => {
    // Build source lookup
    const sourceByTitle = new Map<string, CitationSource>();
    const sourceByUrl = new Map<string, CitationSource>();

    sources.forEach((s, idx) => {
      sourceByTitle.set(s.title.toLowerCase(), { ...s, id: idx });
      if (s.url) sourceByUrl.set(s.url, { ...s, id: idx });
    });

    // Process text to replace verbose citations with markers
    let text = rawText;
    const usedSources: CitationSource[] = [];
    const citationMap = new Map<string, number>();

    // Pattern to match various citation formats
    const patterns = [
      // [Title - URL] or [Title]
      /\[([^\]]+?)(?:\s*[-–—]\s*(?:https?:\/\/[^\]]+|legal-db:\/\/[^\]]+))?\]/g,
      // [Legal result "X"]
      /\[Legal result\s*["']?([^"'\]]+)["']?\]/gi,
      // [Section X - legal-db result "Y"]
      /\[([^–\]]+)\s*[-–—]\s*legal-db\s*result\s*["']?([^"'\]]+)["']?\]/gi,
      // 【Title】
      /【([^】]+)】/g,
    ];

    for (const pattern of patterns) {
      text = text.replace(pattern, (match, title) => {
        const titleLower = (title || "").toLowerCase().trim();

        // Check if we've already processed this citation
        if (citationMap.has(match)) {
          const idx = citationMap.get(match)!;
          return `<sup data-cite="${idx}">[${idx + 1}]</sup>`;
        }

        // Try to find matching source
        let source = sourceByTitle.get(titleLower);

        // Try partial match
        if (!source) {
          for (const [key, s] of sourceByTitle) {
            if (
              key.includes(titleLower) ||
              titleLower.includes(key.slice(0, 20))
            ) {
              source = s;
              break;
            }
          }
        }

        // Create citation entry
        const idx = usedSources.length;
        const citationSource: CitationSource = source || {
          id: idx,
          title: title || match,
          url: "",
        };

        usedSources.push(citationSource);
        citationMap.set(match, idx);

        return `<sup data-cite="${idx}">[${idx + 1}]</sup>`;
      });
    }

    return { processedText: text, mappedSources: usedSources };
  }, [rawText, sources]);

  return (
    <CitedText
      text={processedText}
      sources={mappedSources.length > 0 ? mappedSources : sources}
      onSourceClick={onSourceClick}
      className={className}
    />
  );
}
