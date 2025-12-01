/**
 * useCitations Hook
 *
 * React hook for managing and displaying source citations in chat messages
 */

import { useMemo } from "react";
import type { Citation } from "@/lib/citations";

export type CitationData = {
  citations: Array<{
    id: string;
    marker: string;
    title: string;
    url: string;
    snippet: string;
    type: string;
    confidence: number;
  }>;
  metadata: {
    totalCitations: number;
    verifiedCount: number;
    averageConfidence: number;
  };
};

/**
 * Extract citations from message parts (tool results)
 */
export function extractCitationsFromMessage(message: any): CitationData | null {
  if (!message?.parts) return null;

  for (const part of message.parts) {
    // Check for citation data in custom data parts
    if (part.type === "data-citations" && part.data) {
      return part.data as CitationData;
    }

    // Check for tool results that might contain sources
    if (part.type === "tool-result") {
      const result = part.result || part.content;
      if (!result) continue;

      const parsed = typeof result === "string" ? JSON.parse(result) : result;

      // Check for sources in various formats
      const sources =
        parsed?.rawResults || parsed?.results || parsed?.sources || [];

      if (sources.length > 0) {
        return buildCitationDataFromSources(sources);
      }
    }
  }

  return null;
}

/**
 * Build citation data from raw sources
 */
function buildCitationDataFromSources(sources: any[]): CitationData {
  const citations = sources.slice(0, 5).map((source, index) => ({
    id: String(index + 1),
    marker: `[${index + 1}]`,
    title: source.title || "Untitled",
    url: source.url || "",
    snippet: source.content?.substring(0, 300) || "",
    type: inferCitationType(source.url || ""),
    confidence: source.score || source.relevanceScore || 0.5,
  }));

  const verifiedCount = citations.filter((c) => c.confidence >= 0.7).length;
  const avgConfidence =
    citations.length > 0
      ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
      : 0;

  return {
    citations,
    metadata: {
      totalCitations: citations.length,
      verifiedCount,
      averageConfidence: avgConfidence,
    },
  };
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
 * Hook to extract and manage citations from a chat message
 */
export function useCitations(message: any) {
  const citationData = useMemo(() => {
    return extractCitationsFromMessage(message);
  }, [message]);

  const hasCitations =
    citationData !== null && citationData.citations.length > 0;

  const getCitationByMarker = (marker: string) => {
    if (!citationData) return null;
    return citationData.citations.find((c) => c.marker === marker) || null;
  };

  const getCitationById = (id: string) => {
    if (!citationData) return null;
    return citationData.citations.find((c) => c.id === id) || null;
  };

  return {
    citations: citationData?.citations || [],
    metadata: citationData?.metadata || null,
    hasCitations,
    getCitationByMarker,
    getCitationById,
  };
}

/**
 * Hook to extract citations from multiple messages
 */
export function useMessagesCitations(messages: any[]) {
  const allCitations = useMemo(() => {
    const citations: Map<string, CitationData["citations"][0]> = new Map();

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      const data = extractCitationsFromMessage(message);
      if (data) {
        for (const citation of data.citations) {
          // Use URL as unique key to deduplicate
          if (!citations.has(citation.url)) {
            citations.set(citation.url, citation);
          }
        }
      }
    }

    return Array.from(citations.values());
  }, [messages]);

  return {
    citations: allCitations,
    totalCount: allCitations.length,
    hasCitations: allCitations.length > 0,
  };
}
