/**
 * Citation Verifier
 *
 * Verifies that claims in AI responses are actually supported by cited sources
 */

import type { Citation, CitationVerificationResult } from "./types";

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract key terms from a claim
 */
function extractKeyTerms(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(" ");

  // Filter out common stop words
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "again",
    "further",
    "then",
    "once",
    "and",
    "but",
    "or",
    "nor",
    "so",
    "yet",
    "both",
    "either",
    "neither",
    "not",
    "only",
    "own",
    "same",
    "than",
    "too",
    "very",
    "just",
    "also",
    "now",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "every",
    "any",
    "some",
    "no",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
  ]);

  return words.filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Calculate term overlap between claim and source
 */
function calculateTermOverlap(
  claimTerms: string[],
  sourceText: string
): number {
  if (claimTerms.length === 0) return 0;

  const normalizedSource = normalizeText(sourceText);
  let matchCount = 0;

  for (const term of claimTerms) {
    if (normalizedSource.includes(term)) {
      matchCount++;
    }
  }

  return matchCount / claimTerms.length;
}

/**
 * Find the best matching segment in source content
 */
function findBestMatch(
  claim: string,
  sourceContent: string,
  windowSize: number = 200
): { match: string; score: number } {
  const claimTerms = extractKeyTerms(claim);
  const words = sourceContent.split(/\s+/);

  let bestMatch = "";
  let bestScore = 0;

  // Sliding window over source content
  for (let i = 0; i < words.length - 20; i += 10) {
    const window = words.slice(i, i + windowSize / 5).join(" ");
    const score = calculateTermOverlap(claimTerms, window);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = window;
    }
  }

  return { match: bestMatch, score: bestScore };
}

/**
 * Verify a single citation against a claim
 */
export function verifyCitation(
  claim: string,
  citation: Citation
): CitationVerificationResult {
  const issues: string[] = [];

  // Check if citation has content to verify against
  if (!citation.snippet || citation.snippet.length < 20) {
    return {
      citation,
      isVerified: false,
      confidence: 0.3,
      issues: ["Citation has insufficient source content for verification"],
    };
  }

  // Find best matching content
  const { match, score } = findBestMatch(claim, citation.snippet);

  // Determine verification status
  const isVerified = score >= 0.4; // At least 40% term overlap
  const confidence = Math.min(score + citation.confidence * 0.3, 1.0);

  if (score < 0.2) {
    issues.push(
      "Very low content match - claim may not be supported by source"
    );
  } else if (score < 0.4) {
    issues.push("Partial content match - verify claim manually");
  }

  return {
    citation,
    isVerified,
    matchedContent: match,
    confidence,
    issues: issues.length > 0 ? issues : undefined,
  };
}

/**
 * Verify multiple citations against response text
 */
export function verifyAllCitations(
  responseText: string,
  citations: Citation[]
): CitationVerificationResult[] {
  // Split response into sentences/claims
  const sentences = responseText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const results: CitationVerificationResult[] = [];

  for (const citation of citations) {
    // Find sentences that reference this citation
    const relevantSentences = sentences.filter(
      (s) =>
        s.includes(citation.marker) ||
        s.toLowerCase().includes(citation.title.toLowerCase().substring(0, 30))
    );

    if (relevantSentences.length === 0) {
      // Citation exists but isn't referenced in text
      results.push({
        citation,
        isVerified: true, // Still valid, just not inline-cited
        confidence: citation.confidence,
      });
      continue;
    }

    // Verify each relevant sentence
    const claim = relevantSentences.join(" ");
    results.push(verifyCitation(claim, citation));
  }

  return results;
}

/**
 * Calculate overall verification score for a response
 */
export function calculateVerificationScore(
  results: CitationVerificationResult[]
): {
  score: number;
  verifiedCount: number;
  totalCount: number;
  issues: string[];
} {
  if (results.length === 0) {
    return { score: 1.0, verifiedCount: 0, totalCount: 0, issues: [] };
  }

  const verifiedCount = results.filter((r) => r.isVerified).length;
  const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
  const allIssues = results.flatMap((r) => r.issues || []);

  return {
    score: totalConfidence / results.length,
    verifiedCount,
    totalCount: results.length,
    issues: [...new Set(allIssues)],
  };
}
