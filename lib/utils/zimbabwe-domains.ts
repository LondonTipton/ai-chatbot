/**
 * Zimbabwe Legal Domains
 *
 * Curated list of authoritative Zimbabwe legal and government domains
 * for filtering and prioritizing search results.
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
};

/**
 * Comprehensive list of Zimbabwe legal and government domains
 */
export const ZIMBABWE_LEGAL_DOMAINS: ZimbabweDomains = {
  // Government and official domains
  government: [
    "gov.zw",
    "parlzim.gov.zw",
    "justice.gov.zw",
    "zimtreasury.gov.zw",
    "zec.gov.zw",
    "zhrc.org.zw",
  ],

  // Legal information and resources
  legal: [
    "zimlii.org", // Zimbabwe Legal Information Institute
    "veritaszim.net", // Veritas Zimbabwe
    "zlhr.org.zw", // Zimbabwe Lawyers for Human Rights
    "kubatana.net", // Civic society resources
  ],

  // Court systems
  courts: [
    "supremecourt.gov.zw",
    "highcourt.gov.zw",
    "judicialservicecommission.gov.zw",
  ],

  // Professional bodies
  professional: [
    "lawsociety.org.zw", // Law Society of Zimbabwe
    "zbca.co.zw", // Zimbabwe Bar Council Association
  ],

  // Regional legal resources (SADC and African)
  regional: [
    "saflii.org", // Southern African Legal Information Institute
    "africanlii.org", // African Legal Information Institute
  ],
};

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
  return [
    ...ZIMBABWE_LEGAL_DOMAINS.government,
    ...ZIMBABWE_LEGAL_DOMAINS.legal,
    ...ZIMBABWE_LEGAL_DOMAINS.courts,
    ...ZIMBABWE_LEGAL_DOMAINS.professional,
    ...ZIMBABWE_LEGAL_DOMAINS.regional,
  ];
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
