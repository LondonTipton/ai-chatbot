/**
 * Citation Builder
 *
 * Creates structured citations from Tavily search results and legal database results
 */

import type {
  Citation,
  CitationType,
  TavilySource,
  LegalDbSource,
  CombinedSource,
} from "./types";
import { isLegalDbSource } from "./types";

/**
 * Domain to citation type mapping
 */
const DOMAIN_TYPE_MAP: Record<string, CitationType> = {
  "zimlii.org": "case",
  "saflii.org": "case",
  "gov.zw": "government",
  "parlzim.gov.zw": "statute",
  "veritaszim.net": "statute",
  "kubatana.net": "article",
  "newsday.co.zw": "article",
  "herald.co.zw": "article",
  "chronicle.co.zw": "article",
  "legal-db": "case", // Internal legal database
};

/**
 * Legal domain patterns for prioritization
 */
const LEGAL_DOMAINS = [
  "zimlii.org",
  "saflii.org",
  "gov.zw",
  "parlzim.gov.zw",
  "veritaszim.net",
  "legal-db", // Internal legal database
];

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

/**
 * Determine citation type from URL and content
 */
function determineCitationType(
  url: string,
  title: string,
  content: string
): CitationType {
  const domain = extractDomain(url);

  // Check domain mapping first
  for (const [domainPattern, type] of Object.entries(DOMAIN_TYPE_MAP)) {
    if (domain.includes(domainPattern)) {
      return type;
    }
  }

  // Content-based detection
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Case law indicators
  if (
    lowerTitle.match(/\bv\b|\bvs\b/) ||
    lowerContent.includes("judgment") ||
    lowerContent.includes("court held") ||
    url.includes("/judgment/")
  ) {
    return "case";
  }

  // Statute indicators
  if (
    lowerTitle.includes("act") ||
    lowerTitle.includes("chapter") ||
    lowerContent.includes("section") ||
    url.includes("/act/")
  ) {
    return "statute";
  }

  // Regulation indicators
  if (
    lowerTitle.includes("regulation") ||
    lowerTitle.includes("statutory instrument") ||
    lowerContent.includes("si ")
  ) {
    return "regulation";
  }

  // Government source
  if (domain.endsWith(".gov.zw") || domain.endsWith(".gov.za")) {
    return "government";
  }

  return "other";
}

/**
 * Calculate confidence score based on source quality
 */
function calculateConfidence(source: TavilySource): number {
  const domain = extractDomain(source.url);
  let confidence = 0.5; // Base confidence

  // Boost for legal domains
  if (LEGAL_DOMAINS.some((d) => domain.includes(d))) {
    confidence += 0.3;
  }

  // Boost for relevance score from Tavily
  const relevance = source.score || source.relevanceScore || 0;
  confidence += relevance * 0.2;

  // Boost for content length (more context = more reliable)
  if (source.content && source.content.length > 500) {
    confidence += 0.1;
  }

  // Cap at 1.0
  return Math.min(confidence, 1.0);
}

/**
 * Extract the most relevant snippet from content
 */
function extractRelevantSnippet(
  content: string,
  maxLength: number = 300
): string {
  if (!content) return "";

  // Clean up the content
  let snippet = content.trim();

  // If content is short enough, return as-is
  if (snippet.length <= maxLength) {
    return snippet;
  }

  // Try to find a sentence boundary
  const truncated = snippet.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastQuestion = truncated.lastIndexOf("?");
  const lastExclaim = truncated.lastIndexOf("!");

  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclaim);

  if (lastSentenceEnd > maxLength * 0.5) {
    return truncated.substring(0, lastSentenceEnd + 1);
  }

  return truncated + "...";
}

/**
 * Build a citation from a Tavily source
 */
export function buildCitation(source: TavilySource, index: number): Citation {
  const id = String(index + 1);
  const domain = extractDomain(source.url);
  const type = determineCitationType(source.url, source.title, source.content);

  return {
    id,
    marker: `[${id}]`,
    title: source.title,
    url: source.url,
    snippet: extractRelevantSnippet(source.content),
    domain,
    type,
    confidence: calculateConfidence(source),
    publishedDate: source.publishedDate || source.published_date,
    accessedDate: new Date().toISOString(),
    relevanceScore: source.score || source.relevanceScore,
  };
}

/**
 * Build a citation from a legal database source
 */
export function buildLegalDbCitation(
  source: LegalDbSource,
  index: number
): Citation {
  const id = String(index + 1);
  const metadata = source.metadata || {};

  // Determine type from source file name
  let type: CitationType = "case";
  const lowerSource = source.source.toLowerCase();
  const lowerFile = source.sourceFile.toLowerCase();

  if (
    lowerSource.includes("act") ||
    lowerFile.includes("act") ||
    lowerSource.includes("chapter")
  ) {
    type = "statute";
  } else if (lowerSource.includes("regulation") || lowerFile.includes("si ")) {
    type = "regulation";
  }

  // Use case_identifier for title if available, otherwise fall back to source file
  const caseIdentifier = metadata.case_identifier;
  const title = caseIdentifier
    ? `${caseIdentifier} (${source.source})`
    : `${source.source} - ${source.sourceFile}`;

  return {
    id,
    marker: `[${id}]`,
    title,
    url: `legal-db://${source.docId || metadata.doc_id || "unknown"}`,
    snippet: extractRelevantSnippet(source.text, 400), // Longer snippets for legal DB
    domain: "legal-db",
    type,
    confidence: Math.min(source.score + 0.3, 1.0), // Boost confidence for internal DB
    accessedDate: new Date().toISOString(),
    relevanceScore: source.score,
    // Include rich legal metadata for enhanced tooltips
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
  };
}

/**
 * Build citations from combined sources (Tavily + Legal DB)
 * Prioritizes legal database sources, then legal web domains
 */
export function buildCitationsFromResults(
  sources: CombinedSource[]
): Citation[] {
  if (!sources || sources.length === 0) {
    return [];
  }

  const citations: Citation[] = [];
  const seenUrls = new Set<string>();
  const seenDocIds = new Set<string>();

  // Separate legal DB and Tavily sources
  const legalDbSources: LegalDbSource[] = [];
  const tavilySources: TavilySource[] = [];

  for (const source of sources) {
    if (isLegalDbSource(source)) {
      legalDbSources.push(source);
    } else {
      tavilySources.push(source as TavilySource);
    }
  }

  // Sort legal DB sources by score (highest first)
  legalDbSources.sort((a, b) => b.score - a.score);

  // Sort Tavily sources by relevance and legal domain priority
  const sortedTavilySources = [...tavilySources].sort((a, b) => {
    const aDomain = extractDomain(a.url);
    const bDomain = extractDomain(b.url);

    const aIsLegal = LEGAL_DOMAINS.some((d) => aDomain.includes(d));
    const bIsLegal = LEGAL_DOMAINS.some((d) => bDomain.includes(d));

    if (aIsLegal && !bIsLegal) return -1;
    if (!aIsLegal && bIsLegal) return 1;

    const aScore = a.score || a.relevanceScore || 0;
    const bScore = b.score || b.relevanceScore || 0;
    return bScore - aScore;
  });

  // Add legal DB citations first (prioritized), deduplicate by docId
  for (const source of legalDbSources) {
    const docId = source.docId || source.text.substring(0, 50);
    if (seenDocIds.has(docId)) continue;
    seenDocIds.add(docId);

    citations.push(buildLegalDbCitation(source, citations.length));
    if (citations.length >= 40) break; // Limit total citations to 40
  }

  // Add Tavily citations
  for (const source of sortedTavilySources) {
    if (seenUrls.has(source.url)) continue;
    seenUrls.add(source.url);

    citations.push(buildCitation(source, citations.length));
    if (citations.length >= 40) break; // Limit total citations to 40
  }

  return citations;
}

/**
 * Check if a domain is a legal/authoritative source
 */
export function isLegalSource(url: string): boolean {
  const domain = extractDomain(url);
  return LEGAL_DOMAINS.some((d) => domain.includes(d));
}
