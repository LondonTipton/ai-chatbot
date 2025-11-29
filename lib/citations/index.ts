/**
 * Citation System
 *
 * Source attribution for AI-generated legal responses
 *
 * Usage:
 * ```typescript
 * import { createCitedResponse, buildCitationsFromResults } from '@/lib/citations';
 *
 * // After getting Tavily results
 * const citedResponse = createCitedResponse(aiResponse, tavilyResults, {
 *   insertInlineMarkers: true,
 *   appendReferences: true,
 * });
 *
 * // Access the formatted response and citations
 * console.log(citedResponse.text);
 * console.log(citedResponse.citations);
 * console.log(citedResponse.metadata);
 * ```
 */

// Types
export type {
  Citation,
  CitationType,
  CitedResponse,
  CitationVerificationResult,
  TavilySource,
  LegalDbSource,
  CombinedSource,
} from "./types";

export { isLegalDbSource } from "./types";

// Citation building
export {
  buildCitation,
  buildLegalDbCitation,
  buildCitationsFromResults,
  isLegalSource,
} from "./citation-builder";

// Citation verification
export {
  verifyCitation,
  verifyAllCitations,
  calculateVerificationScore,
} from "./citation-verifier";

// Citation formatting
export {
  createCitedResponse,
  formatCitation,
  formatReferencesSection,
  formatCitationsAsLinks,
  extractExistingMarkers,
  validateMarkers,
} from "./citation-formatter";

// Citation processing (cleanup verbose citations)
export {
  processCitations,
  cleanupVerboseCitations,
  convertSimpleCitationsToBadges,
  convertMarkdownLinksToBadges,
  removeGeneratedReferenceSections,
  type ProcessedCitation,
  type ProcessedResponse,
} from "./citation-processor";

// Passage highlighting
export {
  findHighlightedPassages,
  segmentTextWithHighlights,
  getHighlightStats,
  type HighlightedPassage,
  type SourceDocument,
  type TextSegment,
} from "./passage-highlighter";
