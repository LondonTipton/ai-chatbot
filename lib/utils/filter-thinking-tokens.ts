/**
 * Filter out thinking tokens and internal reasoning from message content
 * These patterns indicate the model is exposing its internal process
 */

const THINKING_PATTERNS = [
  // Explicit thought process markers
  /thought process \d+:/gi,
  /thinking:/gi,
  /internal reasoning:/gi,
  /step \d+:/gi,

  // Tool usage exposure
  /let me search for/gi,
  /i'll use tavily/gi,
  /i'll search for/gi,
  /i'll extract/gi,
  /using tavily/gi,
  /calling tavily/gi,

  // Decision-making exposure
  /according to (my )?instructions/gi,
  /need to search/gi,
  /must use/gi,
  /should use/gi,
  /will use/gi,

  // Process descriptions
  /first, i need to/gi,
  /then i'll/gi,
  /next, i'll/gi,
  /after that, i'll/gi,
];

// Regex patterns for section splitting (defined at top level for performance)
const SECTION_SPLIT_REGEX = /\n\n+/;
const THOUGHT_PROCESS_REGEX = /^thought process/i;
const THINKING_MARKER_REGEX = /^thinking:/i;
const INTERNAL_REASONING_REGEX = /^internal reasoning:/i;

/**
 * Check if text contains thinking tokens
 */
export function containsThinkingTokens(text: string): boolean {
  return THINKING_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Filter out thinking token sections from text
 * Returns cleaned text or null if entire message is thinking tokens
 */
export function filterThinkingTokens(text: string): string | null {
  if (!text) {
    return text;
  }

  // Split by paragraphs/sections
  const sections = text.split(SECTION_SPLIT_REGEX);

  // Filter out sections that are primarily thinking tokens
  const cleanedSections = sections.filter((section) => {
    const lowerSection = section.toLowerCase();

    // Check if section starts with thinking markers
    if (
      THOUGHT_PROCESS_REGEX.test(lowerSection) ||
      THINKING_MARKER_REGEX.test(lowerSection) ||
      INTERNAL_REASONING_REGEX.test(lowerSection)
    ) {
      return false;
    }

    // Check if section contains multiple thinking patterns
    const matchCount = THINKING_PATTERNS.filter((pattern) =>
      pattern.test(section)
    ).length;

    // If more than 2 patterns match, likely a thinking section
    if (matchCount > 2) {
      return false;
    }

    return true;
  });

  // If all sections were filtered, return null
  if (cleanedSections.length === 0) {
    return null;
  }

  return cleanedSections.join("\n\n");
}

/**
 * Extract thinking content for debugging (optional)
 */
export function extractThinkingContent(text: string): string[] {
  const sections = text.split(SECTION_SPLIT_REGEX);

  return sections.filter((section) => {
    const lowerSection = section.toLowerCase();
    return (
      THOUGHT_PROCESS_REGEX.test(lowerSection) ||
      THINKING_MARKER_REGEX.test(lowerSection) ||
      INTERNAL_REASONING_REGEX.test(lowerSection)
    );
  });
}
