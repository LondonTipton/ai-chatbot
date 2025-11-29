/**
 * Passage Highlighter
 *
 * Identifies sentences/phrases in AI responses that match source content
 * and marks them for visual highlighting with source attribution.
 *
 * Enhanced algorithm features:
 * - N-gram matching with configurable phrase lengths
 * - Fuzzy matching for minor variations (typos, punctuation)
 * - Legal term awareness (preserves section references)
 * - Sentence boundary detection for cleaner highlights
 * - Confidence scoring based on match quality
 */

export type HighlightedPassage = {
  text: string;
  startIndex: number;
  endIndex: number;
  sourceIndex: number;
  confidence: number;
  matchType: "exact" | "fuzzy" | "semantic";
};

export type SourceDocument = {
  title: string;
  url: string;
  content?: string;
  legalMetadata?: {
    caseIdentifier?: string;
    court?: string;
    judge?: string;
    decisionDate?: string;
    topics?: string[];
  };
};

export type TextSegment = {
  text: string;
  isHighlighted: boolean;
  sourceIndex?: number;
  source?: SourceDocument;
  confidence?: number;
};

/**
 * Normalize text for comparison
 * Preserves word boundaries while removing noise
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'") // Normalize quotes
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, "-") // Normalize dashes
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Tokenize text into words, preserving legal references
 */
function tokenize(text: string): string[] {
  // Split on whitespace but keep legal references together
  // e.g., "s12B(3)" stays as one token
  return text
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, "")); // Trim punctuation from edges
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein-based similarity for fuzzy matching
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  // Quick check: if length difference is too large, skip expensive calculation
  if (longer.length - shorter.length > longer.length * 0.3) {
    return 0;
  }

  // Simple character overlap for performance
  const longerChars = new Set(longer.split(""));
  const shorterChars = shorter.split("");
  const overlap = shorterChars.filter((c) => longerChars.has(c)).length;

  return overlap / longer.length;
}

/**
 * Extract n-grams (word sequences) from text
 */
function extractNgrams(
  words: string[],
  minN: number,
  maxN: number
): Array<{ phrase: string; words: string[]; start: number; end: number }> {
  const ngrams: Array<{
    phrase: string;
    words: string[];
    start: number;
    end: number;
  }> = [];

  for (let n = maxN; n >= minN; n--) {
    for (let i = 0; i <= words.length - n; i++) {
      const phraseWords = words.slice(i, i + n);
      const phrase = phraseWords.join(" ");

      // Skip if too short in characters
      if (phrase.length < 12) continue;

      ngrams.push({
        phrase,
        words: phraseWords,
        start: i,
        end: i + n,
      });
    }
  }

  return ngrams;
}

/**
 * Find the original text position from word index
 */
function findOriginalPosition(
  originalText: string,
  words: string[],
  wordIndex: number
): number {
  let pos = 0;
  let currentWord = 0;

  while (pos < originalText.length && currentWord < wordIndex) {
    // Skip whitespace
    while (pos < originalText.length && /\s/.test(originalText[pos])) {
      pos++;
    }

    // Skip word
    const wordStart = pos;
    while (pos < originalText.length && !/\s/.test(originalText[pos])) {
      pos++;
    }

    if (pos > wordStart) {
      currentWord++;
    }
  }

  // Skip leading whitespace for the target word
  while (pos < originalText.length && /\s/.test(originalText[pos])) {
    pos++;
  }

  return pos;
}

/**
 * Find the end position of a word sequence in original text
 */
function findEndPosition(
  originalText: string,
  startPos: number,
  wordCount: number
): number {
  let pos = startPos;
  let wordsFound = 0;

  while (pos < originalText.length && wordsFound < wordCount) {
    // Skip whitespace
    while (pos < originalText.length && /\s/.test(originalText[pos])) {
      pos++;
    }

    // Find word end
    while (pos < originalText.length && !/\s/.test(originalText[pos])) {
      pos++;
    }

    wordsFound++;
  }

  return pos;
}

/**
 * Expand match to sentence boundaries for cleaner highlights
 */
function expandToSentenceBoundaries(
  text: string,
  start: number,
  end: number
): { start: number; end: number } {
  // Find sentence start (look for . ! ? or start of text)
  let sentenceStart = start;
  while (sentenceStart > 0) {
    const char = text[sentenceStart - 1];
    if (
      /[.!?]/.test(char) &&
      sentenceStart > 1 &&
      /\s/.test(text[sentenceStart])
    ) {
      break;
    }
    sentenceStart--;
  }

  // Find sentence end
  let sentenceEnd = end;
  while (sentenceEnd < text.length) {
    const char = text[sentenceEnd];
    if (/[.!?]/.test(char)) {
      sentenceEnd++; // Include the punctuation
      break;
    }
    sentenceEnd++;
  }

  // Only expand if the expansion is reasonable (not too much extra text)
  const originalLength = end - start;
  const expandedLength = sentenceEnd - sentenceStart;

  if (expandedLength <= originalLength * 2.5 && expandedLength <= 300) {
    return { start: sentenceStart, end: sentenceEnd };
  }

  return { start, end };
}

/**
 * Check if a range overlaps with existing ranges
 */
function isOverlapping(
  start: number,
  end: number,
  usedRanges: Array<[number, number]>
): boolean {
  return usedRanges.some(
    ([s, e]) =>
      (start >= s && start < e) ||
      (end > s && end <= e) ||
      (start <= s && end >= e)
  );
}

/**
 * Find matching passages between response text and source documents
 * Enhanced with better matching algorithm
 */
export function findHighlightedPassages(
  responseText: string,
  sources: SourceDocument[],
  options: {
    minPhraseWords?: number;
    maxPhraseWords?: number;
    minConfidence?: number;
    expandToSentences?: boolean;
    fuzzyThreshold?: number;
  } = {}
): HighlightedPassage[] {
  const {
    minPhraseWords = 4,
    maxPhraseWords = 12,
    minConfidence = 0.4,
    expandToSentences = false,
    fuzzyThreshold = 0.85,
  } = options;

  const passages: HighlightedPassage[] = [];
  const usedRanges: Array<[number, number]> = [];

  const normalizedResponse = normalizeText(responseText);
  const responseWords = tokenize(normalizedResponse);

  // Build a word index for the response for faster lookups
  const responseWordSet = new Set(responseWords);

  sources.forEach((source, sourceIndex) => {
    if (!source.content || source.content.length < 20) return;

    const normalizedSource = normalizeText(source.content);
    const sourceWords = tokenize(normalizedSource);

    // Extract n-grams from source
    const sourceNgrams = extractNgrams(
      sourceWords,
      minPhraseWords,
      maxPhraseWords
    );

    for (const ngram of sourceNgrams) {
      // Quick check: do most words exist in response?
      const matchingWords = ngram.words.filter((w) => responseWordSet.has(w));
      if (matchingWords.length < ngram.words.length * 0.7) {
        continue; // Skip if less than 70% of words are present
      }

      // Search for this phrase in the response
      const phraseNormalized = ngram.phrase;

      // Try exact match first
      let matchIndex = normalizedResponse.indexOf(phraseNormalized);

      if (matchIndex !== -1) {
        // Found exact match - map back to original positions
        const responseWordsBeforeMatch = tokenize(
          normalizedResponse.substring(0, matchIndex)
        ).length;

        const originalStart = findOriginalPosition(
          responseText,
          responseWords,
          responseWordsBeforeMatch
        );
        let originalEnd = findEndPosition(
          responseText,
          originalStart,
          ngram.words.length
        );

        // Optionally expand to sentence boundaries
        if (expandToSentences) {
          const expanded = expandToSentenceBoundaries(
            responseText,
            originalStart,
            originalEnd
          );
          originalEnd = expanded.end;
        }

        // Check for overlap
        if (!isOverlapping(originalStart, originalEnd, usedRanges)) {
          const confidence = Math.min(1, 0.5 + ngram.words.length * 0.05);

          passages.push({
            text: responseText.substring(originalStart, originalEnd).trim(),
            startIndex: originalStart,
            endIndex: originalEnd,
            sourceIndex,
            confidence,
            matchType: "exact",
          });

          usedRanges.push([originalStart, originalEnd]);
        }
      } else {
        // Try fuzzy matching for longer phrases
        if (ngram.words.length >= 6) {
          // Slide through response looking for similar sequences
          for (let i = 0; i <= responseWords.length - ngram.words.length; i++) {
            const responsePhrase = responseWords
              .slice(i, i + ngram.words.length)
              .join(" ");

            const similarity = stringSimilarity(
              phraseNormalized,
              responsePhrase
            );

            if (similarity >= fuzzyThreshold) {
              const originalStart = findOriginalPosition(
                responseText,
                responseWords,
                i
              );
              const originalEnd = findEndPosition(
                responseText,
                originalStart,
                ngram.words.length
              );

              if (!isOverlapping(originalStart, originalEnd, usedRanges)) {
                passages.push({
                  text: responseText
                    .substring(originalStart, originalEnd)
                    .trim(),
                  startIndex: originalStart,
                  endIndex: originalEnd,
                  sourceIndex,
                  confidence: similarity * 0.8, // Slightly lower confidence for fuzzy
                  matchType: "fuzzy",
                });

                usedRanges.push([originalStart, originalEnd]);
              }
              break; // Found a match, move to next ngram
            }
          }
        }
      }
    }
  });

  // Sort by position and filter by confidence
  return passages
    .filter((p) => p.confidence >= minConfidence)
    .sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Convert response text to segments with highlight information
 */
export function segmentTextWithHighlights(
  responseText: string,
  sources: SourceDocument[],
  options?: Parameters<typeof findHighlightedPassages>[2]
): TextSegment[] {
  const passages = findHighlightedPassages(responseText, sources, options);
  const segments: TextSegment[] = [];

  if (passages.length === 0) {
    return [{ text: responseText, isHighlighted: false }];
  }

  let currentIndex = 0;

  for (const passage of passages) {
    // Add non-highlighted text before this passage
    if (passage.startIndex > currentIndex) {
      const beforeText = responseText.substring(
        currentIndex,
        passage.startIndex
      );
      if (beforeText.trim()) {
        segments.push({
          text: beforeText,
          isHighlighted: false,
        });
      }
    }

    // Add highlighted passage
    segments.push({
      text: passage.text,
      isHighlighted: true,
      sourceIndex: passage.sourceIndex,
      source: sources[passage.sourceIndex],
      confidence: passage.confidence,
    });

    currentIndex = passage.endIndex;
  }

  // Add remaining text
  if (currentIndex < responseText.length) {
    const remainingText = responseText.substring(currentIndex);
    if (remainingText.trim()) {
      segments.push({
        text: remainingText,
        isHighlighted: false,
      });
    }
  }

  return segments;
}

/**
 * Get highlight statistics for a response
 */
export function getHighlightStats(
  responseText: string,
  sources: SourceDocument[]
): {
  totalPassages: number;
  highlightedChars: number;
  totalChars: number;
  coveragePercent: number;
  sourcesCited: number[];
} {
  const passages = findHighlightedPassages(responseText, sources);

  const highlightedChars = passages.reduce(
    (sum, p) => sum + (p.endIndex - p.startIndex),
    0
  );

  const sourcesCited = [...new Set(passages.map((p) => p.sourceIndex))];

  return {
    totalPassages: passages.length,
    highlightedChars,
    totalChars: responseText.length,
    coveragePercent:
      responseText.length > 0
        ? Math.round((highlightedChars / responseText.length) * 100)
        : 0,
    sourcesCited,
  };
}
