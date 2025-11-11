/**
 * Citation Validator - Post-Processing Filter
 *
 * Validates case law citations before displaying to users
 * Blocks responses with hallucinated or invalid citations
 */

export type CitationValidationResult = {
  isValid: boolean;
  violations: string[];
  citationCount: number;
  suspiciousPatterns: string[];
};

// Pre-compiled regex patterns for performance
const AUTHORITY_TABLE_PATTERN = /\|[^|]*Authority[^|]*\|/i;
const YEAR_CITATION_PATTERN = /\[\d{4}\]/;
const VERIFICATION_CLAIM_PATTERN = /verified|confirmed|checked/i;
const TRADITIONAL_LEADERS_ACT_16G_PATTERN =
  /Traditional Leaders Act.*Section 16\(g\)/i;
const ZIMLII_LANGUAGE_SUFFIX_PATTERN = /\/eng@|\/fre@/;
const ZIMLII_CASE_NUMBER_PATTERN = /\/([A-Z]{2,})\s*(\d{1,3})\/(\d{4})/i;

/**
 * Common statutory misattributions in Zimbabwe law
 */
const STATUTORY_MISATTRIBUTIONS = [
  {
    pattern: TRADITIONAL_LEADERS_ACT_16G_PATTERN,
    correct: "Customary Law and Local Courts Act [Chapter 7:05] Section 16(g)",
    description:
      "Section 16(g) jurisdiction limits are in Customary Law and Local Courts Act, not Traditional Leaders Act",
  },
];

/**
 * Validate case law citations in agent response
 * Returns validation result with specific violations
 */
export function validateCitations(
  response: string,
  toolWasUsed: boolean
): CitationValidationResult {
  const violations: string[] = [];
  const suspiciousPatterns: string[] = [];

  // Pattern 1: Detect case citations (e.g., [2015] ZWHHC 164, SC 13/18, etc.)
  const casePatterns = [
    /\[\d{4}\]\s*ZW[A-Z]{2,4}\s*\d+/g, // [2015] ZWHHC 164
    /\b[A-Z]{2,4}\s*\d+\/\d{2,4}\b/g, // SC 13/18, HH 45/15
    /\bHC\s*\d+\s*of\s*\d{4}\b/gi, // HC 4885 of 2014
  ];

  let citationCount = 0;
  const citations: string[] = [];

  for (const pattern of casePatterns) {
    const matches = response.match(pattern);
    if (matches) {
      citationCount += matches.length;
      citations.push(...matches);
    }
  }

  // RULE 1: If NO tool was used but citations exist → HALLUCINATION
  if (!toolWasUsed && citationCount > 0) {
    violations.push(
      `CRITICAL: ${citationCount} case citations found but NO research tool was used. This is hallucination.`
    );
  }

  // RULE 2: Maximum 5 citations (search tools return 5-10 results max)
  if (citationCount > 5) {
    violations.push(
      `Too many citations: ${citationCount} cases cited (max 5 from search tools). Likely hallucination.`
    );
  }

  // RULE 3: Detect suspicious tables with many cases
  if (response.match(AUTHORITY_TABLE_PATTERN)) {
    const tableRows = response
      .split("\n")
      .filter(
        (line) => line.includes("|") && line.match(YEAR_CITATION_PATTERN)
      );
    if (tableRows.length > 5) {
      suspiciousPatterns.push(
        `Large table with ${tableRows.length} cases (suspicious)`
      );
    }
  }

  // RULE 4: Detect "verified" claims without tool usage
  if (!toolWasUsed && response.match(VERIFICATION_CLAIM_PATTERN)) {
    suspiciousPatterns.push(
      'Claims to have "verified" cases but no research tool was used'
    );
  }

  // RULE 5: Detect ZimLII URLs without tool usage
  const zimliiUrls = response.match(/https?:\/\/.*zimlii\.org\/[^\s)]+/g) || [];
  if (!toolWasUsed && zimliiUrls.length > 0) {
    violations.push(
      `${zimliiUrls.length} ZimLII URLs found but no research tool used. URLs are likely fabricated.`
    );
  }

  // RULE 5.5: Validate ZimLII URL formats (detect 404-prone URLs)
  for (const url of zimliiUrls) {
    // Check for invalid ZimLII judgment URL patterns
    if (url.includes("/akn/zw/judgment/")) {
      // Must have language suffix like /eng@
      if (!url.match(ZIMLII_LANGUAGE_SUFFIX_PATTERN)) {
        suspiciousPatterns.push(
          `ZimLII URL missing language suffix (likely 404): ${url.substring(
            0,
            80
          )}...`
        );
      }

      // Check for suspicious case numbers
      const caseMatch = url.match(ZIMLII_CASE_NUMBER_PATTERN);
      if (caseMatch) {
        const caseNumber = Number.parseInt(caseMatch[2], 10);
        const year = Number.parseInt(caseMatch[3], 10);

        // Flag suspicious case numbers (too high)
        if (caseNumber > 300) {
          suspiciousPatterns.push(
            `Suspiciously high case number (${caseNumber}) in URL - may be fabricated`
          );
        }

        // Flag invalid years
        const currentYear = new Date().getFullYear();
        if (year < 1980 || year > currentYear + 1) {
          suspiciousPatterns.push(
            `Invalid year (${year}) in case citation - outside valid range`
          );
        }
      }

      // Check for incomplete URLs (too short)
      if (url.split("/").length < 8) {
        suspiciousPatterns.push(
          `Incomplete ZimLII URL (missing segments): ${url.substring(0, 80)}...`
        );
      }
    }
  }

  // RULE 5.6: Citation-URL mismatch detection
  if (
    citationCount > 0 &&
    zimliiUrls.length > 0 &&
    citationCount > zimliiUrls.length + 2
  ) {
    // Allow some margin
    suspiciousPatterns.push(
      `Citation-URL mismatch: ${citationCount} case citations but only ${zimliiUrls.length} ZimLII URLs provided`
    );
  }

  // RULE 6: Detect statutory misattributions (common mistakes)
  for (const misattribution of STATUTORY_MISATTRIBUTIONS) {
    if (response.match(misattribution.pattern)) {
      suspiciousPatterns.push(
        `Possible statutory misattribution: ${misattribution.description}`
      );
    }
  }

  // RULE 7: Detect specific known-hallucinated cases
  // NOTE: Some case names may be real but were previously hallucinated with fake details
  const knownHallucinations = [
    "Brian Maneka",
    "Chikomba v Moyo",
    "Mbare v Nyamande",
    "Murehwa v Nyamande",
    "Mutsvairo v Zimre",
    // Removed "Chihoro v Murombo" - this is a real case: HH 07/2011
  ];

  for (const fake of knownHallucinations) {
    if (response.includes(fake)) {
      violations.push(`Known hallucinated case detected: "${fake}"`);
    }
  }

  const isValid = violations.length === 0;

  return {
    isValid,
    violations,
    citationCount,
    suspiciousPatterns,
  };
}

/**
 * Block response if citations are invalid
 * Throws error that will be caught by error handler
 */
export function blockInvalidCitations(
  response: string,
  toolWasUsed: boolean
): void {
  const validation = validateCitations(response, toolWasUsed);

  if (!validation.isValid) {
    const errorMessage = [
      "🚨 BLOCKED: Invalid case law citations detected",
      "",
      ...validation.violations,
      "",
      ...(validation.suspiciousPatterns.length > 0
        ? ["Suspicious patterns:", ...validation.suspiciousPatterns]
        : []),
      "",
      `Total citations found: ${validation.citationCount}`,
      `Research tool used: ${toolWasUsed ? "YES" : "NO"}`,
    ].join("\n");

    throw new Error(errorMessage);
  }
}

/**
 * Safe response with user-friendly error message
 */
export function getSafeCitationErrorResponse(): string {
  return `I apologize, but I cannot provide case law citations at this time. To ensure accuracy, I need to search for verified cases from authoritative sources.

Please try:
1. Rephrasing your question to be more specific
2. Asking about general legal principles first
3. Allowing me to use research tools to find real cases

Remember: I will only cite cases that I've found through verified legal databases like ZimLII.`;
}
