/**
 * Citation Processor
 *
 * Processes AI response text to convert verbose inline citations
 * to clean superscript markers that link to sources
 */

import type { CitationType } from "./types";

export type ProcessedCitation = {
  id: number;
  marker: string;
  originalText: string;
  title: string;
  url: string;
  content?: string;
  type: CitationType;
  confidence: number;
};

export type ProcessedResponse = {
  text: string;
  citations: ProcessedCitation[];
};

/**
 * Patterns to match verbose inline citations in AI responses
 */
const CITATION_PATTERNS = [
  // [Source Title - URL] or [Source Title]
  /\[([^\]]+?)(?:\s*[-–—]\s*(?:https?:\/\/[^\]]+|legal-db:\/\/[^\]]+))?\]/g,
  // [Legal result "HH 89-11"] style
  /\[Legal result\s*["']?([^"'\]]+)["']?\]/gi,
  // [Section X of the Y Act – legal-db result "Z"]
  /\[([^–\]]+)\s*[-–—]\s*legal-db\s*result\s*["']?([^"'\]]+)["']?\]/gi,
  // (Source: Title) style
  /\(Source:\s*([^)]+)\)/gi,
  // 【Title】 style (Chinese brackets sometimes used)
  /【([^】]+)】/g,
];

/**
 * Extract domain from URL for display
 */
function extractDomain(url: string): string {
  if (url.startsWith("legal-db://")) {
    return "legal-db";
  }
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

/**
 * Infer citation type from title and URL
 */
function inferCitationType(title: string, url: string): CitationType {
  const lowerTitle = title.toLowerCase();

  if (url.startsWith("legal-db://")) {
    if (lowerTitle.includes("act") || lowerTitle.includes("chapter")) {
      return "statute";
    }
    return "case";
  }

  if (
    lowerTitle.includes(" v ") ||
    lowerTitle.includes(" vs ") ||
    lowerTitle.match(/\b(hh|sc|hc)\s*\d+/i)
  ) {
    return "case";
  }

  if (
    lowerTitle.includes("act") ||
    lowerTitle.includes("chapter") ||
    lowerTitle.includes("section")
  ) {
    return "statute";
  }

  return "other";
}

/**
 * Process AI response text to extract and normalize citations
 */
export function processCitations(
  text: string,
  sources: Array<{
    title: string;
    url: string;
    content?: string;
    score?: number;
  }>
): ProcessedResponse {
  const citations: ProcessedCitation[] = [];
  const citationMap = new Map<string, number>(); // Map original text to citation index
  let processedText = text;

  // Build a lookup map from sources
  const sourceMap = new Map<string, (typeof sources)[0]>();
  for (const source of sources) {
    // Index by various keys for matching
    const titleLower = source.title.toLowerCase();
    sourceMap.set(titleLower, source);
    sourceMap.set(source.url, source);

    // Also index by partial title matches
    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 4);
    for (const word of titleWords.slice(0, 3)) {
      if (!sourceMap.has(word)) {
        sourceMap.set(word, source);
      }
    }
  }

  // Find all citation-like patterns in the text
  const allMatches: Array<{
    fullMatch: string;
    title: string;
    index: number;
  }> = [];

  for (const pattern of CITATION_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        fullMatch: match[0],
        title: match[1] || match[0],
        index: match.index,
      });
    }
  }

  // Sort by position (process from end to start to preserve indices)
  allMatches.sort((a, b) => b.index - a.index);

  // Process each match
  for (const match of allMatches) {
    const { fullMatch, title } = match;

    // Skip if already processed
    if (citationMap.has(fullMatch)) {
      const existingIdx = citationMap.get(fullMatch)!;
      processedText = processedText.replace(
        fullMatch,
        `{{CITE:${existingIdx}}}`
      );
      continue;
    }

    // Try to find matching source
    const titleLower = title.toLowerCase().trim();
    let matchedSource = sourceMap.get(titleLower);

    // Try partial matching if exact match fails
    if (!matchedSource) {
      const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
      for (const word of titleWords) {
        if (sourceMap.has(word)) {
          matchedSource = sourceMap.get(word);
          break;
        }
      }
    }

    // Create citation
    const citationIdx = citations.length;
    const citation: ProcessedCitation = {
      id: citationIdx + 1,
      marker: `[${citationIdx + 1}]`,
      originalText: fullMatch,
      title: matchedSource?.title || title,
      url: matchedSource?.url || "",
      content: matchedSource?.content,
      type: inferCitationType(
        matchedSource?.title || title,
        matchedSource?.url || ""
      ),
      confidence: matchedSource?.score || 0.5,
    };

    citations.push(citation);
    citationMap.set(fullMatch, citationIdx);

    // Replace in text with placeholder
    processedText = processedText.replace(fullMatch, `{{CITE:${citationIdx}}}`);
  }

  // Convert placeholders to superscript markers
  processedText = processedText.replace(
    /\{\{CITE:(\d+)\}\}/g,
    (_, idx) => `<sup data-cite="${idx}">[${Number.parseInt(idx) + 1}]</sup>`
  );

  return {
    text: processedText,
    citations,
  };
}

/**
 * Convert markdown links to numbered citation badges
 * Transforms [Title](url) to ⟨n⟩ format for cleaner display
 *
 * @param text - The markdown text to process
 * @param sources - Array of sources to match against (for numbering)
 * @returns Processed text with numbered badges
 */
export function convertLinksToNumberedBadges(
  text: string,
  sources: Array<{ title: string; url: string }>
): string {
  // Build URL to index map
  const urlToIndex = new Map<string, number>();
  const titleToIndex = new Map<string, number>();

  sources.forEach((source, idx) => {
    if (source.url) {
      urlToIndex.set(source.url.toLowerCase(), idx + 1);
      // Also map without protocol
      const cleanUrl = source.url.replace(/^https?:\/\/(www\.)?/, "");
      urlToIndex.set(cleanUrl.toLowerCase(), idx + 1);
    }
    if (source.title) {
      titleToIndex.set(source.title.toLowerCase(), idx + 1);
      // Also map partial title (first 30 chars)
      titleToIndex.set(source.title.toLowerCase().substring(0, 30), idx + 1);
    }
  });

  let processed = text;
  let citationCounter = 0;
  const usedNumbers = new Map<string, number>(); // Track which URLs got which numbers

  // Convert markdown links [text](url) to numbered badges
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (match, linkText, url) => {
      // Skip image links
      if (match.startsWith("![")) {
        return match;
      }

      // Try to find matching source by URL
      const urlLower = url.toLowerCase();
      const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, "").toLowerCase();

      let number = urlToIndex.get(urlLower) || urlToIndex.get(cleanUrl);

      // If not found by URL, try by title
      if (!number) {
        const titleLower = linkText.toLowerCase();
        number =
          titleToIndex.get(titleLower) ||
          titleToIndex.get(titleLower.substring(0, 30));
      }

      // If still not found, assign a new number
      if (!number) {
        if (usedNumbers.has(urlLower)) {
          number = usedNumbers.get(urlLower)!;
        } else {
          citationCounter++;
          number = sources.length + citationCounter;
          usedNumbers.set(urlLower, number);
        }
      }

      // Return numbered badge format that will be rendered as a badge
      return `[[${number}]]`;
    }
  );

  return processed;
}

/**
 * Convert simple [n] citation markers to [[n]] badge format
 * This is the primary citation format - LLM outputs [1], [2], etc.
 * and we convert them to [[1]], [[2]] for badge rendering
 *
 * IMPORTANT: Avoids converting numbers in legal contexts like:
 * - "section 12" or "s12B(3)" - section references
 * - "subsection (3)" or "subsection [3]" - subsection references
 * - "paragraph (a)" - paragraph references
 */
export function convertSimpleCitationsToBadges(text: string): string {
  // Convert [1], [2], etc. to [[1]], [[2]] for badge rendering
  // But avoid:
  // 1. Markdown links [text](url)
  // 2. Legal section references preceded by section/subsection/s/paragraph keywords
  // 3. Numbers that appear to be part of legal citations (e.g., "s12B(3)")

  // Support up to 3 digits for large source counts (10 tavily + 80 legal-db)
  return text.replace(/\[(\d{1,3})\](?!\()/g, (match, num, offset, str) => {
    // Look back up to 50 chars for context
    const lookback = str.substring(Math.max(0, offset - 50), offset);

    // Skip if preceded by legal section keywords
    if (
      /\b(section|subsection|sub-section|paragraph|clause|article|reg|regulation)\s*$/i.test(
        lookback
      ) ||
      /\b(section|subsection|sub-section|paragraph|clause|article)\s*\(\d*\)\s*$/i.test(
        lookback
      ) ||
      /\bs\s*\d+[a-z]*\s*$/i.test(lookback) || // s12, s12B, s 12
      /\b(s|sec|ss)\d+[a-z]*\s*\(\d*\)\s*$/i.test(lookback) || // s12(3), s12B(1)
      /\(\d+\)\s*$/i.test(lookback) // Ends with (n) - likely legal ref like (1)(2)[3]
    ) {
      return match; // Keep original, don't convert to badge
    }

    return `[[${num}]]`;
  });
}

/**
 * Clean up legal-db:// URLs from text
 * These are internal database references that shouldn't be shown to users
 */
export function cleanupLegalDbUrls(text: string): string {
  let cleaned = text;

  // Remove legal-db URLs in various formats:

  // 1. Parenthesized: (legal-db://xxx) or ( legal-db://xxx )
  cleaned = cleaned.replace(/\(\s*legal-db:\/\/[a-f0-9]+\s*\)/gi, "");

  // 2. With blocked marker: (legal-db://xxx [blocked]) or legal-db://xxx [blocked]
  cleaned = cleaned.replace(
    /\(?\s*legal-db:\/\/[a-f0-9]+\s*\[blocked\]\s*\)?/gi,
    ""
  );

  // 3. Markdown links: [text](legal-db://xxx) - keep the text
  cleaned = cleaned.replace(/\[([^\]]+)\]\(legal-db:\/\/[^)]+\)/gi, "$1");

  // 4. Quoted URLs: "legal-db://xxx" or 'legal-db://xxx'
  cleaned = cleaned.replace(/["']\s*legal-db:\/\/[a-f0-9]+\s*["']/gi, "");

  // 5. Backtick URLs: `legal-db://xxx`
  cleaned = cleaned.replace(/`legal-db:\/\/[a-f0-9]+`/gi, "");

  // 6. Standalone URLs (must be careful not to break surrounding text)
  cleaned = cleaned.replace(/\s*legal-db:\/\/[a-f0-9]+/gi, "");

  return cleaned;
}

/**
 * Remove LLM-generated reference sections and clean up URLs
 * The LLM sometimes generates its own reference tables which we don't want
 */
export function removeGeneratedReferenceSections(text: string): string {
  let cleaned = text;

  // First, clean up all legal-db URLs
  cleaned = cleanupLegalDbUrls(cleaned);

  // Remove "Key references (with URLs)" sections and similar
  cleaned = cleaned.replace(
    /#{1,3}\s*\d*\.?\s*Key references.*?(?=#{1,3}\s*\d|$)/gis,
    ""
  );

  // Remove [blocked] in all contexts - LLM outputs this when it can't access URLs
  // Patterns: "[blocked]", "[ blocked ]", "(blocked)", etc.
  cleaned = cleaned.replace(/\[\s*blocked\s*\]/gi, "");
  cleaned = cleaned.replace(/\(\s*blocked\s*\)/gi, "");

  // Remove tables that contain legal-db or blocked references
  cleaned = cleaned.replace(/\|[^|]*\|[^|]*legal-db[^|]*\|[^\n]*\n?/gi, "");
  cleaned = cleaned.replace(/\|[^|]*\|[^|]*blocked[^|]*\|[^\n]*\n?/gi, "");

  // Remove table headers if the table body was removed
  cleaned = cleaned.replace(
    /\|\s*Source\s*\|\s*URL[^|]*\|\s*\n\|[-:\s|]+\|\s*\n(?!\|)/gi,
    ""
  );

  // Remove "All citations are taken directly from..." disclaimers
  cleaned = cleaned.replace(
    /\*?\(?All (citations|URLs) are (taken|the identifiers).*?\)?\*?\n?/gi,
    ""
  );

  // Remove "Sources: deep-research results..." lines
  cleaned = cleaned.replace(/\*?Sources?:\s*deep-research.*?\n/gi, "");

  // Remove empty parentheses left behind after URL removal
  cleaned = cleaned.replace(/\(\s*\)/g, "");

  // Clean up multiple spaces left behind after removals
  cleaned = cleaned.replace(/  +/g, " ");

  // Clean up multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Convert markdown links [text](url) to numbered badges [[n]]
 * Maps URLs to source indices for proper numbering
 */
export function convertMarkdownLinksToBadges(
  text: string,
  sources: Array<{ title: string; url: string }>
): string {
  // Build URL to index map
  const urlToIndex = new Map<string, number>();

  sources.forEach((source, idx) => {
    if (source.url) {
      urlToIndex.set(source.url.toLowerCase(), idx + 1);
      // Also map without protocol
      const cleanUrl = source.url.replace(/^https?:\/\/(www\.)?/, "");
      urlToIndex.set(cleanUrl.toLowerCase(), idx + 1);
    }
  });

  let citationCounter = sources.length;
  const usedNumbers = new Map<string, number>();

  // Convert markdown links [text](url) to numbered badges
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    // Skip image links
    if (match.startsWith("![")) {
      return match;
    }

    // Try to find matching source by URL
    const urlLower = url.toLowerCase();
    const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, "").toLowerCase();

    let number = urlToIndex.get(urlLower) || urlToIndex.get(cleanUrl);

    // If not found, assign a new number
    if (!number) {
      if (usedNumbers.has(urlLower)) {
        number = usedNumbers.get(urlLower)!;
      } else {
        citationCounter++;
        number = citationCounter;
        usedNumbers.set(urlLower, number);
      }
    }

    return `[[${number}]]`;
  });
}

/**
 * Simple citation cleanup - removes verbose citations without full processing
 * Use when you just want cleaner text without the full citation system
 *
 * IMPORTANT: Preserves markdown structure (tables, lists, newlines)
 * Preserves simple [n] markers which will be converted to badges
 */
export function cleanupVerboseCitations(text: string): string {
  let cleaned = text;

  // First, convert simple [n] markers to badge format [[n]]
  cleaned = convertSimpleCitationsToBadges(cleaned);

  // Remove [Source Title - URL] patterns (long form with URL)
  cleaned = cleaned.replace(
    /\[([^\]]+?)\s*[-–—]\s*(?:https?:\/\/[^\]]+|legal-db:\/\/[^\]]+)\]/g,
    ""
  );

  // Remove [Legal result "X"] or [Legal result X] patterns
  cleaned = cleaned.replace(/\[Legal result\s*["']?[^"'\]]*["']?\]/gi, "");

  // Remove [Section X of Y Act – legal-db result "Z"] patterns
  cleaned = cleaned.replace(
    /\[[^\]]*[-–—]\s*legal-db\s*result\s*["']?[^"'\]]*["']?\]/gi,
    ""
  );

  // Remove 【Title】 style citations (Chinese brackets)
  cleaned = cleaned.replace(/【[^】]+】/g, "");

  // Remove (Source: X) patterns but NOT markdown links
  cleaned = cleaned.replace(/\(Source:\s*[^)]+\)/gi, "");

  // Remove standalone URLs in parentheses ONLY if not preceded by ]
  // This preserves markdown links [text](url) but removes bare (url) citations
  cleaned = cleaned.replace(/(?<!\])\(https?:\/\/[^)\s]+\)/g, "");

  // Remove verbose [Source Title] citations that are clearly citations (not [n] markers)
  // Be very conservative - only remove if it contains citation-specific patterns
  cleaned = cleaned.replace(/\[([^\]]{10,})\]/g, (match, content) => {
    // Keep if it's just a number (citation marker)
    if (/^\d{1,2}$/.test(content.trim())) {
      return match;
    }
    // Keep markdown links [text](url)
    if (/\]\s*\(/.test(match)) {
      return match;
    }
    // Keep if it contains code backticks
    if (content.includes("`")) {
      return match;
    }
    // Keep if it looks like a table cell reference or markdown
    if (content.includes("|") || content.startsWith("!")) {
      return match;
    }
    // Remove if it explicitly looks like a citation reference
    if (
      /\b(legal-db|legal result|source:|zimlii|saflii|caselaw)\b/i.test(
        content
      ) ||
      /https?:\/\//.test(content)
    ) {
      return "";
    }
    // Keep everything else
    return match;
  });

  // Clean up only horizontal whitespace (spaces/tabs), preserve newlines
  cleaned = cleaned.replace(/[ \t]+([,.])/g, "$1"); // Remove space before punctuation
  cleaned = cleaned.replace(/([,.])\s*\1+/g, "$1"); // Remove duplicate punctuation
  cleaned = cleaned.replace(/[ \t]{2,}/g, " "); // Collapse multiple spaces (not newlines)

  return cleaned;
}
