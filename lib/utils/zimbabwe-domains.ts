/**
 * Zimbabwe Legal and Government Domain Registry
 *
 * Curated list of authoritative Zimbabwe legal and government domains
 * for filtering and prioritizing search results with intelligent tier-based prioritization.
 */

/**
 * Structure for organizing Zimbabwe legal domains by category
 */
export type ZimbabweDomains = {
  government: string[];
  legal: string[];
  courts: string[];
  professional: string[];
  regional: string[];
  publishers: string[];
  news: string[];
};

/**
 * Comprehensive list of Zimbabwe legal and government domains
 * Enhanced with additional authoritative sources and tier-based organization
 */
export const ZIMBABWE_LEGAL_DOMAINS: ZimbabweDomains = {
  // Government and official domains (TIER 1 - Highest Authority)
  government: [
    "zim.gov.zw", // Ministry of Justice, Legal and Parliamentary Affairs
    "gov.zw", // General government domains
    "parlzim.gov.zw", // Parliament of Zimbabwe
    "parliament.go.zw", // Parliament of Zimbabwe (alternative)
    "justice.gov.zw", // Department of Justice
    "zimtreasury.gov.zw", // Zimbabwe Treasury
    "zec.gov.zw", // Zimbabwe Electoral Commission
    "zhrc.org.zw", // Zimbabwe Human Rights Commission
    "mopse.gov.zw", // Ministry of Public Service & Social Welfare
    "zimra.co.zw", // Zimbabwe Revenue Authority (tax law)
    "rbz.co.zw", // Reserve Bank of Zimbabwe (financial law)
    "nssa.co.zw", // National Social Security Authority
    "molab.gov.zw", // Ministry of Labour (employment law)
  ],

  // Legal information and resources (TIER 2 - Professional)
  legal: [
    "zimlii.org", // Zimbabwe Legal Information Institute
    "veritaszim.net", // Veritas Zimbabwe (legal analysis & advocacy)
    "zlhr.org.zw", // Zimbabwe Lawyers for Human Rights
    "zils.ac.zw", // Zimbabwe Institute of Legal Studies
    "zlsc.co.zw", // Zimbabwe Law Society
    "lrfzim.com", // Legal Resource Foundation (LRF)
    "lawportal.co.zw", // Legal portal
    "law.co.zw", // Law portal aggregator
    "msu.ac.zw", // Midlands State University (Law Faculty)
    "uz.ac.zw", // University of Zimbabwe (Law Faculty)
    "kubatana.net", // Civic society resources
  ],

  // Court systems (TIER 1 - Highest Authority)
  courts: [
    "jsc.org.zw", // Judicial Service Commission
    "supremecourt.co.zw", // Supreme Court of Zimbabwe
    "supremecourt.gov.zw", // Supreme Court (alternative)
    "highcourt.gov.zw", // High Court
    "courtsofzimbabwe.co.zw", // General courts information
    "judicialservicecommission.gov.zw", // Judicial Service Commission (alternative)
  ],

  // Professional bodies (TIER 2 - Professional)
  professional: [
    "zlsc.co.zw", // Law Society of Zimbabwe / Zimbabwe Law Society
    "zbca.co.zw", // Zimbabwe Bar Council Association
    "zimrights.org", // Zimbabwe Human Rights NGO Forum
    "hrforumzim.com", // Human rights resources
    "changezimbabwe.org", // Civil society organization
    "caiczimbabwe.org", // Community Action Information Centre
  ],

  // Regional legal resources (TIER 3 - Regional/Comparative)
  regional: [
    "sadc.int", // Southern African Development Community
    "au.int", // African Union
    "ecowas.int", // ECOWAS (West African legal context)
    "achpr.org", // African Commission on Human and Peoples' Rights
    "southernafricalaw.org", // Southern Africa legal resources
    "africlaw.com", // African legal information
    "saflii.org", // Southern African Legal Information Institute
    "africanlii.org", // African Legal Information Institute
  ],

  // Publishers & Legal Databases (TIER 3 - Publishers)
  publishers: [
    "africaportals.org", // Africa Portals legal resources
    "nli.org.za", // Namibian Law Institute (SADC context)
    "bailii.org", // British and Irish Legal Information Institute (common law reference)
  ],

  // News & Commentary (TIER 4 - News, Lower Priority for legal accuracy)
  news: [
    "herald.co.zw", // The Herald (official news)
    "newsday.co.zw", // NewsDay
    "newzimbabwe.com", // New Zimbabwe
    "thestandard.co.zw", // The Standard
  ],
};

/**
 * Priority tier mapping for domain weighting
 */
export const DOMAIN_PRIORITY_TIERS = {
  tier1: [
    ...ZIMBABWE_LEGAL_DOMAINS.government,
    ...ZIMBABWE_LEGAL_DOMAINS.courts,
  ],
  tier2: [
    ...ZIMBABWE_LEGAL_DOMAINS.legal,
    ...ZIMBABWE_LEGAL_DOMAINS.professional,
  ],
  tier3: [
    ...ZIMBABWE_LEGAL_DOMAINS.regional,
    ...ZIMBABWE_LEGAL_DOMAINS.publishers,
  ],
  tier4: ZIMBABWE_LEGAL_DOMAINS.news,
};

/**
 * Categorized list of all domains for easy reference
 */
export const ALL_ZIMBABWE_LEGAL_DOMAINS = [
  ...ZIMBABWE_LEGAL_DOMAINS.government,
  ...ZIMBABWE_LEGAL_DOMAINS.courts,
  ...ZIMBABWE_LEGAL_DOMAINS.legal,
  ...ZIMBABWE_LEGAL_DOMAINS.professional,
  ...ZIMBABWE_LEGAL_DOMAINS.regional,
  ...ZIMBABWE_LEGAL_DOMAINS.publishers,
  ...ZIMBABWE_LEGAL_DOMAINS.news,
];

/**
 * Get priority domains for a specific research depth
 * Used to guide Tavily's ranking without restricting searches
 */
export function getPriorityDomainsForDepth(
  depth: "quick" | "standard" | "deep" | "comprehensive"
): string[] {
  switch (depth) {
    case "quick":
      // Quick searches: focus on primary sources (TIER 1)
      return DOMAIN_PRIORITY_TIERS.tier1;

    case "standard":
      // Standard: add legal professionals (TIER 1-2)
      return [...DOMAIN_PRIORITY_TIERS.tier1, ...DOMAIN_PRIORITY_TIERS.tier2];

    case "deep":
      // Deep: add professional analysis (TIER 1-2)
      return [...DOMAIN_PRIORITY_TIERS.tier1, ...DOMAIN_PRIORITY_TIERS.tier2];

    case "comprehensive":
      // Comprehensive: include regional context and news (ALL TIERS)
      return ALL_ZIMBABWE_LEGAL_DOMAINS;

    default:
      // Default to standard depth
      return [...DOMAIN_PRIORITY_TIERS.tier1, ...DOMAIN_PRIORITY_TIERS.tier2];
  }
}

/**
 * Returns a flat array of all Zimbabwe legal domains for use in search filters.
 *
 * @returns Array of domain strings
 *
 * @example
 * const domains = getZimbabweLegalDomains();
 * // Use in Tavily search: { includeDomains: domains }
 */
export function getZimbabweLegalDomains(): string[] {
  return ALL_ZIMBABWE_LEGAL_DOMAINS;
}

/**
 * Returns only government and court domains (highest authority sources).
 *
 * @returns Array of official domain strings
 *
 * @example
 * const officialDomains = getOfficialZimbabweDomains();
 * // Use for queries requiring authoritative sources only
 */
export function getOfficialZimbabweDomains(): string[] {
  return [
    ...ZIMBABWE_LEGAL_DOMAINS.government,
    ...ZIMBABWE_LEGAL_DOMAINS.courts,
  ];
}

/**
 * Checks if a given URL belongs to a Zimbabwe legal domain.
 *
 * @param url - The URL to check
 * @returns True if the URL is from a Zimbabwe legal domain
 *
 * @example
 * isZimbabweLegalDomain("https://zimlii.org/case/123") // Returns true
 * isZimbabweLegalDomain("https://example.com") // Returns false
 */
export function isZimbabweLegalDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const allDomains = getZimbabweLegalDomains();

    return allDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Categorize a domain by tier
 */
export function getDomainTier(
  url: string
): "tier1" | "tier2" | "tier3" | "tier4" | "external" {
  try {
    const domain = new URL(url).hostname;

    if (
      ZIMBABWE_LEGAL_DOMAINS.government.some((d) => domain.includes(d)) ||
      ZIMBABWE_LEGAL_DOMAINS.courts.some((d) => domain.includes(d))
    ) {
      return "tier1";
    }
    if (
      ZIMBABWE_LEGAL_DOMAINS.legal.some((d) => domain.includes(d)) ||
      ZIMBABWE_LEGAL_DOMAINS.professional.some((d) => domain.includes(d))
    ) {
      return "tier2";
    }
    if (
      ZIMBABWE_LEGAL_DOMAINS.regional.some((d) => domain.includes(d)) ||
      ZIMBABWE_LEGAL_DOMAINS.publishers.some((d) => domain.includes(d))
    ) {
      return "tier3";
    }
    if (ZIMBABWE_LEGAL_DOMAINS.news.some((d) => domain.includes(d))) {
      return "tier4";
    }
    return "external";
  } catch {
    return "external";
  }
}

/**
 * Get all domains from a specific tier
 */
export function getDomainsFromTier(
  tier: "tier1" | "tier2" | "tier3" | "tier4"
): string[] {
  return DOMAIN_PRIORITY_TIERS[tier];
}

/**
 * Filters an array of search results to only include Zimbabwe legal domains.
 *
 * @param results - Array of search results with url property
 * @returns Filtered array containing only Zimbabwe legal domain results
 *
 * @example
 * const filtered = filterZimbabweResults(searchResults);
 */
export function filterZimbabweResults<T extends { url: string }>(
  results: T[]
): T[] {
  return results.filter((result) => isZimbabweLegalDomain(result.url));
}
