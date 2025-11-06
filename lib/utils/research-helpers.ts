/**
 * Research Helper Utilities
 *
 * Functions for analyzing research results and identifying gaps
 * in legal research queries.
 */

/**
 * Represents a research gap that needs to be addressed
 */
export type ResearchGap = {
  type:
    | "missing_context"
    | "insufficient_depth"
    | "missing_jurisdiction"
    | "outdated_info"
    | "missing_sources";
  description: string;
  priority: "high" | "medium" | "low";
  suggestedQuery?: string;
};

/**
 * Represents initial research results to analyze
 */
export type ResearchResults = {
  query: string;
  results: Array<{
    title?: string;
    content?: string;
    url?: string;
    publishedDate?: string;
    score?: number;
  }>;
  jurisdiction?: string;
};

/**
 * Identifies gaps in research results that need additional investigation.
 *
 * This function analyzes search results to determine if:
 * - Zimbabwe legal context is missing
 * - Results are too shallow or generic
 * - Sources are outdated
 * - Key legal concepts are not covered
 *
 * @param research - The research results to analyze
 * @returns Array of identified research gaps
 *
 * @example
 * const gaps = identifyResearchGaps({
 *   query: "employment law",
 *   results: searchResults,
 *   jurisdiction: "Zimbabwe"
 * });
 *
 * if (gaps.length > 2) {
 *   // Trigger deep dive workflow
 * }
 */
export function identifyResearchGaps(research: ResearchResults): ResearchGap[] {
  const gaps: ResearchGap[] = [];
  const { query, results, jurisdiction = "Zimbabwe" } = research;

  // Check if we have any results
  if (!results || results.length === 0) {
    gaps.push({
      type: "missing_sources",
      description: "No search results found",
      priority: "high",
      suggestedQuery: query,
    });
    return gaps;
  }

  // Check for Zimbabwe context
  const hasZimbabweContext = results.some((result) => {
    const content = `${result.title || ""} ${
      result.content || ""
    }`.toLowerCase();
    return (
      content.includes("zimbabwe") ||
      content.includes("zim") ||
      content.includes("harare") ||
      content.includes("sadc")
    );
  });

  if (!hasZimbabweContext && jurisdiction.toLowerCase() === "zimbabwe") {
    gaps.push({
      type: "missing_jurisdiction",
      description: "Results lack Zimbabwe-specific legal context",
      priority: "high",
      suggestedQuery: `${query} Zimbabwe law`,
    });
  }

  // Check for content depth
  const avgContentLength =
    results.reduce((sum, r) => sum + (r.content?.length || 0), 0) /
    results.length;

  if (avgContentLength < 200) {
    gaps.push({
      type: "insufficient_depth",
      description: "Search results are too brief or lack detail",
      priority: "medium",
      suggestedQuery: `${query} detailed analysis`,
    });
  }

  // Check for recent information
  const hasRecentInfo = results.some((result) => {
    if (!result.publishedDate) {
      return false;
    }

    try {
      const publishedDate = new Date(result.publishedDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      return publishedDate > oneYearAgo;
    } catch {
      return false;
    }
  });

  if (!hasRecentInfo) {
    gaps.push({
      type: "outdated_info",
      description: "No recent sources found (within last year)",
      priority: "medium",
      suggestedQuery: `${query} recent updates ${new Date().getFullYear()}`,
    });
  }

  // Check for legal terminology coverage
  const legalTerms = [
    "statute",
    "act",
    "regulation",
    "case law",
    "precedent",
    "court",
    "judgment",
    "legislation",
    "constitutional",
  ];

  const allContent = results
    .map((r) => `${r.title || ""} ${r.content || ""}`.toLowerCase())
    .join(" ");

  const hasLegalTerms = legalTerms.some((term) => allContent.includes(term));

  if (!hasLegalTerms) {
    gaps.push({
      type: "missing_context",
      description: "Results lack legal terminology and context",
      priority: "high",
      suggestedQuery: `${query} legal framework statute`,
    });
  }

  // Check for source diversity
  const uniqueDomains = new Set(
    results
      .map((r) => {
        try {
          return new URL(r.url || "").hostname;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );

  if (uniqueDomains.size < 2 && results.length > 2) {
    gaps.push({
      type: "missing_sources",
      description: "Limited source diversity (single domain)",
      priority: "low",
      suggestedQuery: `${query} multiple sources`,
    });
  }

  return gaps;
}

/**
 * Determines if research results are sufficient or need deep dive.
 *
 * @param gaps - Array of research gaps
 * @returns True if deep dive is recommended
 *
 * @example
 * const gaps = identifyResearchGaps(research);
 * if (shouldDeepDive(gaps)) {
 *   // Trigger comprehensive analysis workflow
 * }
 */
export function shouldDeepDive(gaps: ResearchGap[]): boolean {
  // Deep dive if we have more than 2 gaps
  if (gaps.length > 2) {
    return true;
  }

  // Deep dive if we have any high priority gaps
  const hasHighPriorityGaps = gaps.some((gap) => gap.priority === "high");
  if (hasHighPriorityGaps) {
    return true;
  }

  return false;
}

/**
 * Generates targeted search queries to fill identified research gaps.
 *
 * @param gaps - Array of research gaps
 * @returns Array of suggested search queries
 *
 * @example
 * const gaps = identifyResearchGaps(research);
 * const queries = generateGapFillingQueries(gaps);
 * // Use queries for additional searches
 */
export function generateGapFillingQueries(gaps: ResearchGap[]): string[] {
  return gaps
    .filter((gap) => gap.suggestedQuery)
    .sort((a, b) => {
      // Sort by priority: high > medium > low
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .map((gap) => gap.suggestedQuery as string)
    .slice(0, 3); // Limit to top 3 queries
}

/**
 * Summarizes research gaps for logging or display.
 *
 * @param gaps - Array of research gaps
 * @returns Human-readable summary string
 *
 * @example
 * const summary = summarizeGaps(gaps);
 * console.log(summary);
 */
export function summarizeGaps(gaps: ResearchGap[]): string {
  if (gaps.length === 0) {
    return "No research gaps identified";
  }

  const highPriority = gaps.filter((g) => g.priority === "high").length;
  const mediumPriority = gaps.filter((g) => g.priority === "medium").length;
  const lowPriority = gaps.filter((g) => g.priority === "low").length;

  const parts: string[] = [];

  if (highPriority > 0) {
    parts.push(
      `${highPriority} high priority gap${highPriority > 1 ? "s" : ""}`
    );
  }
  if (mediumPriority > 0) {
    parts.push(
      `${mediumPriority} medium priority gap${mediumPriority > 1 ? "s" : ""}`
    );
  }
  if (lowPriority > 0) {
    parts.push(`${lowPriority} low priority gap${lowPriority > 1 ? "s" : ""}`);
  }

  return `Found ${gaps.length} research gap${
    gaps.length > 1 ? "s" : ""
  }: ${parts.join(", ")}`;
}
