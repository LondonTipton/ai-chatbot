/**
 * Citation Formatter
 *
 * Formats AI responses with inline citations and generates citation blocks
 */

import type { Citation, CitedResponse, CitationType } from "./types";
import { buildCitationsFromResults } from "./citation-builder";
import {
  verifyAllCitations,
  calculateVerificationScore,
} from "./citation-verifier";
import type { TavilySource } from "./types";

/**
 * Insert citation markers into response text
 * Maps claims to their supporting sources
 */
function insertCitationMarkers(text: string, citations: Citation[]): string {
  if (citations.length === 0) return text;

  let result = text;

  // For each citation, find relevant sentences and add markers
  for (const citation of citations) {
    // Look for mentions of the source title or key terms
    const titleWords = citation.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3);

    // Find sentences that might reference this source
    const sentences = result.split(/(?<=[.!?])\s+/);
    const updatedSentences = sentences.map((sentence) => {
      const lowerSentence = sentence.toLowerCase();

      // Check if sentence contains key terms from the source
      const matchCount = titleWords.filter((word) =>
        lowerSentence.includes(word)
      ).length;

      // If good match and no citation marker yet, add one
      if (matchCount >= 2 && !sentence.includes("[")) {
        // Add marker before the period
        return sentence.replace(/([.!?])$/, ` ${citation.marker}$1`);
      }

      return sentence;
    });

    result = updatedSentences.join(" ");
  }

  return result;
}

/**
 * Format a single citation for display
 */
export function formatCitation(citation: Citation): string {
  const typeLabel = getCitationTypeLabel(citation.type);
  const date = citation.publishedDate
    ? ` (${new Date(citation.publishedDate).getFullYear()})`
    : "";

  return `${citation.marker} ${citation.title}${date} - ${typeLabel}\n   ${citation.url}`;
}

/**
 * Get human-readable label for citation type
 */
function getCitationTypeLabel(type: CitationType): string {
  const labels: Record<CitationType, string> = {
    case: "Case Law",
    statute: "Legislation",
    regulation: "Regulation",
    article: "Article",
    government: "Government Source",
    other: "Source",
  };
  return labels[type];
}

/**
 * Format citations as a references section
 */
export function formatReferencesSection(citations: Citation[]): string {
  if (citations.length === 0) return "";

  const lines = ["\n---\n**Sources:**\n"];

  for (const citation of citations) {
    lines.push(formatCitation(citation));
  }

  return lines.join("\n");
}

/**
 * Format citations as markdown links
 */
export function formatCitationsAsLinks(citations: Citation[]): string {
  if (citations.length === 0) return "";

  return citations.map((c) => `${c.marker} [${c.title}](${c.url})`).join("\n");
}

/**
 * Process AI response with Tavily sources to create cited response
 */
export function createCitedResponse(
  responseText: string,
  sources: TavilySource[],
  options: {
    insertInlineMarkers?: boolean;
    appendReferences?: boolean;
    maxCitations?: number;
  } = {}
): CitedResponse {
  const {
    insertInlineMarkers = true,
    appendReferences = true,
    maxCitations = 5,
  } = options;

  // Build citations from sources
  let citations = buildCitationsFromResults(sources);

  // Limit citations
  if (citations.length > maxCitations) {
    citations = citations.slice(0, maxCitations);
  }

  // Verify citations
  const verificationResults = verifyAllCitations(responseText, citations);
  const verificationScore = calculateVerificationScore(verificationResults);

  // Process response text
  let processedText = responseText;

  if (insertInlineMarkers && citations.length > 0) {
    processedText = insertCitationMarkers(processedText, citations);
  }

  if (appendReferences && citations.length > 0) {
    processedText += formatReferencesSection(citations);
  }

  // Calculate metadata
  const sourceTypes = citations.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {} as Record<CitationType, number>);

  return {
    text: processedText,
    citations,
    metadata: {
      totalCitations: citations.length,
      verifiedCount: verificationScore.verifiedCount,
      averageConfidence: verificationScore.score,
      sourceTypes,
    },
  };
}

/**
 * Extract existing citation markers from text
 */
export function extractExistingMarkers(text: string): string[] {
  const markerPattern = /\[(\d+)\]/g;
  const markers: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(text)) !== null) {
    markers.push(match[0]);
  }

  return [...new Set(markers)];
}

/**
 * Validate that all markers in text have corresponding citations
 */
export function validateMarkers(
  text: string,
  citations: Citation[]
): { valid: boolean; missingMarkers: string[] } {
  const markers = extractExistingMarkers(text);
  const citationIds = new Set(citations.map((c) => c.marker));

  const missingMarkers = markers.filter((m) => !citationIds.has(m));

  return {
    valid: missingMarkers.length === 0,
    missingMarkers,
  };
}
