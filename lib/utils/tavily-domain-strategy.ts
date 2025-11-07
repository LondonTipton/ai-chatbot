/**
 * Tavily Domain Prioritization Strategy
 *
 * Implements smart domain prioritization for Tavily searches:
 * - Excludes low-quality/spam domains to improve relevance
 * - Suggests Zimbabwe legal domains as priority (soft prioritization)
 * - Supports depth-based domain selection
 * - Allows Tavily to search globally while ranking priority domains higher
 */

import { getDomainTier, getPriorityDomainsForDepth } from "./zimbabwe-domains";

export type DomainStrategy = "strict" | "prioritized" | "open";
export type ResearchDepth = "quick" | "standard" | "deep" | "comprehensive";

/**
 * Get domains to EXCLUDE (low-quality sources that pollute results)
 * These are domains that should be filtered out from all searches
 */
export function getExcludeDomains(): string[] {
  return [
    // Social media (unreliable for legal info)
    "reddit.com",
    "quora.com",
    "medium.com",
    "linkedin.com",
    "youtube.com",
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "pinterest.com",

    // SEO spam and affiliate sites
    "w3schools.com", // Not legal-relevant
    "stackoverflow.com", // Programming, not legal
    "wikihow.com",

    // Low-authority comment sections
    "disqus.com",

    // Paywalled sites (won't provide content)
    "lexisnexis.com",
    "westlaw.com",

    // AI-generated content farms
    "huggingface.co", // Model hub, not legal content
  ];
}

/**
 * Get domains to PRIORITIZE based on research depth
 * Used with Tavily's ranking algorithm - Tavily will naturally surface these more
 * This is NOT a restriction - Tavily will still search everywhere
 */
export function getPriorityDomains(
  depth: ResearchDepth = "standard"
): string[] {
  return getPriorityDomainsForDepth(depth);
}

/**
 * Get topic hints to improve result relevance
 * Tavily uses these to filter by relevance, not to restrict domains
 */
export function getTopicHints(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (
    lowerQuery.includes("employment") ||
    lowerQuery.includes("labour") ||
    lowerQuery.includes("labor")
  ) {
    return "labor law, employment law, workplace rights, termination, contracts";
  }
  if (
    lowerQuery.includes("contract") ||
    lowerQuery.includes("agreement") ||
    lowerQuery.includes("parties")
  ) {
    return "contract law, commercial law, legal obligations, breach, remedies";
  }
  if (
    lowerQuery.includes("property") ||
    lowerQuery.includes("land") ||
    lowerQuery.includes("real estate")
  ) {
    return "property law, real estate, land rights, transfer, ownership";
  }
  if (
    lowerQuery.includes("criminal") ||
    lowerQuery.includes("court") ||
    lowerQuery.includes("trial")
  ) {
    return "criminal law, court procedures, legal process, sentencing, evidence";
  }
  if (lowerQuery.includes("constitutional") || lowerQuery.includes("rights")) {
    return "constitutional law, fundamental rights, governance, bill of rights";
  }
  if (
    lowerQuery.includes("company") ||
    lowerQuery.includes("business") ||
    lowerQuery.includes("corporate")
  ) {
    return "corporate law, business law, company registration, incorporation";
  }
  if (lowerQuery.includes("marriage") || lowerQuery.includes("divorce")) {
    return "family law, marriage, divorce, custody, succession";
  }
  if (lowerQuery.includes("tax") || lowerQuery.includes("revenue")) {
    return "tax law, revenue, income tax, VAT, customs";
  }
  if (lowerQuery.includes("intellectual") || lowerQuery.includes("patent")) {
    return "intellectual property law, patents, copyrights, trademarks";
  }
  if (lowerQuery.includes("consumer") || lowerQuery.includes("protection")) {
    return "consumer law, consumer protection, product liability";
  }

  return "zimbabwe law, legal information, legal resources";
}

/**
 * Build optimized Tavily request body with intelligent domain prioritization
 */
export function buildTavilyRequestBody(
  query: string,
  strategy: DomainStrategy = "prioritized",
  depth: ResearchDepth = "standard"
): Record<string, unknown> {
  const baseBody: Record<string, unknown> = {
    query,
    search_depth: "advanced",
    include_answer: true,
    include_raw_content: false,
    max_results: 7,
    topic: "general",
  };

  const requestBody: Record<string, unknown> = { ...baseBody };

  if (strategy === "strict") {
    // Strict: ONLY Zimbabwe sources - use for highly specific queries requiring authoritative sources only
    requestBody.include_domains = getPriorityDomains(depth);
  } else if (strategy === "prioritized") {
    // Prioritized: Exclude spam but search globally
    // Note: Removed include_domains to allow broader, more diverse search results
    // This prevents over-filtering and allows Tavily to find the best matches globally
    requestBody.exclude_domains = getExcludeDomains();
  } else {
    // Open: Just exclude spam, let Tavily find best matches globally
    // Use for comparative law or international context
    requestBody.exclude_domains = getExcludeDomains();
  }

  return requestBody;
}

/**
 * Analyze search results to determine domain distribution
 * Useful for reporting source diversity
 */
export type SourceDistribution = {
  zimbabweAuthority: number;
  zimbabweOther: number;
  regional: number;
  global: number;
};

export function analyzeSourceDistribution(
  results: Array<{ url: string }>
): SourceDistribution {
  const distribution: SourceDistribution = {
    zimbabweAuthority: 0,
    zimbabweOther: 0,
    regional: 0,
    global: 0,
  };

  for (const { url } of results) {
    const tier = getDomainTier(url);

    if (tier === "tier1") {
      distribution.zimbabweAuthority++;
    } else {
      try {
        const domain = new URL(url).hostname;
        if (domain.includes(".zw")) {
          distribution.zimbabweOther++;
        } else if (tier === "tier3") {
          distribution.regional++;
        } else {
          distribution.global++;
        }
      } catch {
        distribution.global++;
      }
    }
  }

  return distribution;
}

/**
 * Select the best strategy based on query characteristics
 */
export function selectOptimalStrategy(query: string): DomainStrategy {
  const lowerQuery = query.toLowerCase();

  // Strict: Very specific Zimbabwe statutory requirements
  if (
    lowerQuery.includes("section ") ||
    lowerQuery.includes("article ") ||
    lowerQuery.includes("zimbabwe act")
  ) {
    return "strict";
  }

  // Prioritized (DEFAULT): General legal questions
  if (
    lowerQuery.includes("how to") ||
    lowerQuery.includes("what is") ||
    lowerQuery.includes("explain")
  ) {
    return "prioritized";
  }

  // Open: Comparative law or international context needed
  if (
    lowerQuery.includes("compare") ||
    lowerQuery.includes("international") ||
    lowerQuery.includes("versus") ||
    lowerQuery.includes("vs ")
  ) {
    return "open";
  }

  // Default to prioritized for balanced results
  return "prioritized";
}

const SIMPLE_QUERY_PATTERN = /^(what\s+is|define|who\s+is|when\s+was)/i;

/**
 * Select research depth based on query complexity
 */
export function selectResearchDepth(query: string): ResearchDepth {
  const lowerQuery = query.toLowerCase();

  // Quick: Simple definitions and facts
  if (SIMPLE_QUERY_PATTERN.test(lowerQuery) && query.length < 50) {
    return "quick";
  }

  // Deep: Complex analysis or specific provisions
  if (
    lowerQuery.includes("section") ||
    lowerQuery.includes("analyze") ||
    lowerQuery.includes("explain in detail") ||
    lowerQuery.includes("break down")
  ) {
    return "deep";
  }

  // Comprehensive: Comparison or broad research
  if (
    lowerQuery.includes("compare") ||
    lowerQuery.includes("survey") ||
    lowerQuery.includes("comprehensive") ||
    lowerQuery.includes("all")
  ) {
    return "comprehensive";
  }

  // Default to standard for balanced depth
  return "standard";
}

/**
 * Build a complete Tavily request with strategy selection
 */
export function buildOptimalTavilyRequest(
  query: string
): Record<string, unknown> {
  const strategy = selectOptimalStrategy(query);
  const depth = selectResearchDepth(query);
  return buildTavilyRequestBody(query, strategy, depth);
}
