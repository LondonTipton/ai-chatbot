import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/synthesis-validator");

export type ValidationResult = {
  isValid: boolean;
  score: number; // 0-100
  citationsMissing: number;
  hallucinations: string[];
  ungroundedClaims: string[];
  warning: string | null;
  details: {
    totalSources: number;
    citedSources: number;
    suspiciousPatterns: number;
    confidence: "high" | "medium" | "low";
  };
};

const TRAILING_PUNCTUATION = /[.,;]$/;
const WHITESPACE_SPLIT = /\s+/;
const URL_PATTERN = /https?:\/\/[^\s)]+/g;

/**
 * Validates that synthesized response is grounded in source data
 *
 * This validator checks for common hallucination patterns:
 * - Fabricated statute references
 * - Invented URLs
 * - Ungrounded specific numbers
 * - Missing source citations
 *
 * @param synthesis - The generated response text
 * @param sources - Array of source objects with title, url, and content
 * @returns ValidationResult with detailed analysis
 */
export function validateSynthesis(
  synthesis: string,
  sources: Array<{ title: string; url: string; content?: string }>
): ValidationResult {
  const hallucinations: string[] = [];
  const ungroundedClaims: string[] = [];
  let warning: string | null = null;

  // Check 1: Are sources cited?
  const citedUrls = sources.filter(
    (s) =>
      synthesis.includes(s.url) ||
      synthesis.includes(s.title) ||
      synthesis.includes("[Source:")
  );

  const citationsMissing = sources.length - citedUrls.length;

  if (citedUrls.length === 0) {
    warning = "⚠️ No sources are cited in the synthesis";
  } else if (citedUrls.length < sources.length * 0.5) {
    warning = `⚠️ Only ${citedUrls.length}/${sources.length} sources cited`;
  }

  // Check 2: Look for fabricated statute references
  const statutePatterns = [
    /Section \d+[a-zA-Z]?\s+(?:of the|under)/gi,
    /Act\s+\d{4}/gi,
    /Chapter \d+:\d+/gi,
    /\bS\.\s*\d+[a-zA-Z]?\b/gi, // S. 42A format
  ];

  let suspiciousPatterns = 0;

  for (const pattern of statutePatterns) {
    const matches = synthesis.match(pattern) || [];
    for (const match of matches) {
      // Check if this specific reference appears in sources
      const foundInSources = sources.some((s) =>
        s.content?.includes(match.trim())
      );

      if (!foundInSources) {
        hallucinations.push(`Statute reference not in sources: "${match}"`);
        suspiciousPatterns++;
      }
    }
  }

  // Check 3: Look for fabricated URLs
  const urlsInSynthesis = synthesis.match(URL_PATTERN) || [];

  for (const url of urlsInSynthesis) {
    const cleanUrl = url.replace(TRAILING_PUNCTUATION, ""); // Remove trailing punctuation
    const foundInSources = sources.some((s) => s.url.includes(cleanUrl));

    if (!foundInSources) {
      hallucinations.push(`Fabricated URL: "${cleanUrl}"`);
      suspiciousPatterns++;
    }
  }

  // Check 4: Look for specific numbers/amounts that might be fabricated
  const numberPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g, // Money amounts
    /\d{4}-\d{2}-\d{2}/g, // Dates
    /\b\d+\s+(?:years?|months?|days?)\b/gi, // Time periods
    /\b\d+%\b/g, // Percentages
  ];

  for (const pattern of numberPatterns) {
    const matches = synthesis.match(pattern) || [];
    for (const match of matches) {
      const foundInSources = sources.some((s) =>
        s.content?.includes(match.trim())
      );

      if (!foundInSources) {
        ungroundedClaims.push(`Specific number not in sources: "${match}"`);
      }
    }
  }

  // Check 5: Look for overly confident claims
  const confidenceKeywords = [
    "definitely",
    "certainly",
    "obviously",
    "clearly states",
    "it is certain",
    "without doubt",
  ];

  for (const keyword of confidenceKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    if (regex.test(synthesis)) {
      const matches = synthesis.match(
        new RegExp(`[^.]*${keyword}[^.]*\\.`, "gi")
      );
      if (matches) {
        for (const match of matches) {
          // Check if this confident claim is backed by sources
          const words = match
            .toLowerCase()
            .split(WHITESPACE_SPLIT)
            .filter((w) => w.length > 4);
          const foundInSources = words.some((word) =>
            sources.some((s) => s.content?.toLowerCase().includes(word))
          );

          if (!foundInSources) {
            ungroundedClaims.push(`Overconfident claim: "${match.trim()}"`);
            suspiciousPatterns++;
          }
        }
      }
    }
  }

  // Calculate validation score
  let score = 100;

  // Deduct points for issues
  score -= citationsMissing * 10; // -10 per missing citation
  score -= hallucinations.length * 20; // -20 per hallucination
  score -= Math.min(ungroundedClaims.length * 5, 30); // -5 per ungrounded claim, max -30
  score = Math.max(0, score); // Floor at 0

  // Determine confidence
  let confidence: "high" | "medium" | "low";
  if (score >= 80 && hallucinations.length === 0) {
    confidence = "high";
  } else if (score >= 60 && hallucinations.length <= 1) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Overall validity
  const isValid =
    citedUrls.length > 0 &&
    hallucinations.length === 0 &&
    ungroundedClaims.length < 5 &&
    score >= 60;

  if (isValid) {
    logger.log("[Validator] ✅ Synthesis passed validation", {
      score,
      confidence,
    });
  } else {
    logger.warn("[Validator] ❌ Synthesis failed validation", {
      score,
      citedSources: citedUrls.length,
      totalSources: sources.length,
      hallucinations: hallucinations.length,
      ungroundedClaims: ungroundedClaims.length,
      confidence,
    });
  }

  return {
    isValid,
    score,
    citationsMissing,
    hallucinations,
    ungroundedClaims,
    warning,
    details: {
      totalSources: sources.length,
      citedSources: citedUrls.length,
      suspiciousPatterns,
      confidence,
    },
  };
}

/**
 * Simple validation for quick checks
 * Returns true if response appears properly grounded
 */
export function quickValidate(
  synthesis: string,
  sources: Array<{ url: string }>
): boolean {
  // Check if at least one source is cited
  const hasCitations = sources.some((s) => synthesis.includes(s.url));

  // Check for common hallucination red flags
  const hasInventedUrls = /https?:\/\/example\.com/gi.test(synthesis);
  const hasFakeGovUrls = /https?:\/\/gov\.zw\/[a-z0-9-]+/gi.test(synthesis);

  return hasCitations && !hasInventedUrls && !hasFakeGovUrls;
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: ValidationResult): string {
  const { isValid, score, details, hallucinations, ungroundedClaims, warning } =
    result;

  const separator =
    "\n═══════════════════════════════════════════════════════════════════════════════\n";
  let output = separator;
  output += "SYNTHESIS VALIDATION REPORT\n";
  output += separator.substring(1);

  output += `Status: ${isValid ? "✅ PASSED" : "❌ FAILED"}\n`;
  output += `Score: ${score}/100\n`;
  output += `Confidence: ${details.confidence.toUpperCase()}\n\n`;

  output += "Sources:\n";
  output += `  Total: ${details.totalSources}\n`;
  output += `  Cited: ${details.citedSources}\n`;
  output += `  Missing: ${result.citationsMissing}\n\n`;

  if (warning) {
    output += `⚠️ Warning: ${warning}\n\n`;
  }

  if (hallucinations.length > 0) {
    output += `🚨 Hallucinations Detected (${hallucinations.length}):\n`;
    for (const h of hallucinations.slice(0, 5)) {
      output += `  • ${h}\n`;
    }
    if (hallucinations.length > 5) {
      output += `  ... and ${hallucinations.length - 5} more\n`;
    }
    output += "\n";
  }

  if (ungroundedClaims.length > 0) {
    output += `⚠️ Ungrounded Claims (${ungroundedClaims.length}):\n`;
    for (const c of ungroundedClaims.slice(0, 3)) {
      output += `  • ${c}\n`;
    }
    if (ungroundedClaims.length > 3) {
      output += `  ... and ${ungroundedClaims.length - 3} more\n`;
    }
    output += "\n";
  }

  output += separator.substring(1);

  return output;
}
