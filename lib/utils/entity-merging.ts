/**
 * Entity Merging Utilities
 *
 * Merges and deduplicates entities from multiple research phases.
 * Used in comprehensive workflows that perform multi-phase research.
 *
 * Research-backed: Entity consolidation improves accuracy (Nature Study 2024)
 */

import type {
  AcademicSource,
  CourtCase,
  ExtractedEntities,
  GovernmentSource,
  NewsSource,
  Statute,
} from "@/lib/types/legal-entities";

/**
 * Regex patterns for normalization (defined at module level for performance)
 */
const TRAILING_SLASH_PATTERN = /\/$/;
const WHITESPACE_PATTERN = /\s+/g;

/**
 * Normalize URL for comparison
 * Removes trailing slashes, query params, and fragments
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove trailing slash, query params, and fragments
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.replace(
      TRAILING_SLASH_PATTERN,
      ""
    );
  } catch {
    // If URL parsing fails, just trim and lowercase
    return url.trim().toLowerCase().replace(TRAILING_SLASH_PATTERN, "");
  }
}

/**
 * Normalize text for comparison
 * Removes extra whitespace and converts to lowercase
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(WHITESPACE_PATTERN, " ");
}

/**
 * Check if two court cases are duplicates
 */
function areCourtCasesDuplicate(a: CourtCase, b: CourtCase): boolean {
  // Same URL = definitely duplicate
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) {
    return true;
  }

  // Same name + citation = duplicate
  if (
    normalizeText(a.name) === normalizeText(b.name) &&
    a.citation &&
    b.citation &&
    normalizeText(a.citation) === normalizeText(b.citation)
  ) {
    return true;
  }

  // Same name + court + date = likely duplicate
  if (
    normalizeText(a.name) === normalizeText(b.name) &&
    a.court &&
    b.court &&
    normalizeText(a.court) === normalizeText(b.court) &&
    a.date === b.date
  ) {
    return true;
  }

  return false;
}

/**
 * Check if two statutes are duplicates
 */
function areStatutesDuplicate(a: Statute, b: Statute): boolean {
  // Same URL = definitely duplicate
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) {
    return true;
  }

  // Same name + section = duplicate
  if (
    normalizeText(a.name) === normalizeText(b.name) &&
    a.section &&
    b.section &&
    normalizeText(a.section) === normalizeText(b.section)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if two academic sources are duplicates
 */
function areAcademicSourcesDuplicate(
  a: AcademicSource,
  b: AcademicSource
): boolean {
  // Same URL = definitely duplicate
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) {
    return true;
  }

  // Same title + year = likely duplicate
  if (normalizeText(a.title) === normalizeText(b.title) && a.year === b.year) {
    return true;
  }

  return false;
}

/**
 * Check if two government sources are duplicates
 */
function areGovernmentSourcesDuplicate(
  a: GovernmentSource,
  b: GovernmentSource
): boolean {
  // Same URL = definitely duplicate
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) {
    return true;
  }

  // Same title + agency = likely duplicate
  if (
    normalizeText(a.title) === normalizeText(b.title) &&
    a.agency &&
    b.agency &&
    normalizeText(a.agency) === normalizeText(b.agency)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if two news sources are duplicates
 */
function areNewsSourcesDuplicate(a: NewsSource, b: NewsSource): boolean {
  // Same URL = definitely duplicate
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) {
    return true;
  }

  // Same title + outlet = likely duplicate
  if (
    normalizeText(a.title) === normalizeText(b.title) &&
    normalizeText(a.outlet) === normalizeText(b.outlet)
  ) {
    return true;
  }

  return false;
}

/**
 * Merge two court cases, preferring the one with more information
 */
function mergeCourtCases(a: CourtCase, b: CourtCase): CourtCase {
  return {
    id: a.id, // Keep first ID
    name: a.name || b.name,
    citation: a.citation || b.citation,
    court: a.court || b.court,
    date: a.date || b.date,
    url: a.url, // Keep first URL
    holding: a.holding || b.holding,
    keyFacts: [...new Set([...a.keyFacts, ...b.keyFacts])], // Merge unique facts
    relevantText:
      a.relevantText.length > b.relevantText.length
        ? a.relevantText
        : b.relevantText,
    sourceContent:
      a.sourceContent.length > b.sourceContent.length
        ? a.sourceContent
        : b.sourceContent,
    confidence:
      a.confidence === "high" || b.confidence === "high"
        ? "high"
        : a.confidence === "medium" || b.confidence === "medium"
        ? "medium"
        : "low",
  };
}

/**
 * Merge two statutes, preferring the one with more information
 */
function mergeStatutes(a: Statute, b: Statute): Statute {
  return {
    id: a.id,
    name: a.name || b.name,
    section: a.section || b.section,
    chapter: a.chapter || b.chapter,
    text: a.text.length > b.text.length ? a.text : b.text,
    url: a.url,
    sourceContent:
      a.sourceContent.length > b.sourceContent.length
        ? a.sourceContent
        : b.sourceContent,
    confidence:
      a.confidence === "high" || b.confidence === "high"
        ? "high"
        : a.confidence === "medium" || b.confidence === "medium"
        ? "medium"
        : "low",
  };
}

/**
 * Merge two academic sources, preferring the one with more information
 */
function mergeAcademicSources(
  a: AcademicSource,
  b: AcademicSource
): AcademicSource {
  return {
    id: a.id,
    title: a.title || b.title,
    authors: [...new Set([...a.authors, ...b.authors])],
    year: a.year || b.year,
    publication: a.publication || b.publication,
    keyFindings: [...new Set([...a.keyFindings, ...b.keyFindings])],
    methodology: a.methodology || b.methodology,
    url: a.url,
    sourceContent:
      a.sourceContent.length > b.sourceContent.length
        ? a.sourceContent
        : b.sourceContent,
    confidence:
      a.confidence === "high" || b.confidence === "high"
        ? "high"
        : a.confidence === "medium" || b.confidence === "medium"
        ? "medium"
        : "low",
  };
}

/**
 * Merge two government sources, preferring the one with more information
 */
function mergeGovernmentSources(
  a: GovernmentSource,
  b: GovernmentSource
): GovernmentSource {
  return {
    id: a.id,
    title: a.title || b.title,
    agency: a.agency || b.agency,
    date: a.date || b.date,
    documentType: a.documentType || b.documentType,
    keyPoints: [...new Set([...a.keyPoints, ...b.keyPoints])],
    url: a.url,
    sourceContent:
      a.sourceContent.length > b.sourceContent.length
        ? a.sourceContent
        : b.sourceContent,
    confidence:
      a.confidence === "high" || b.confidence === "high"
        ? "high"
        : a.confidence === "medium" || b.confidence === "medium"
        ? "medium"
        : "low",
  };
}

/**
 * Merge two news sources, preferring the one with more information
 */
function mergeNewsSources(a: NewsSource, b: NewsSource): NewsSource {
  const mergedQuotes =
    a.keyQuotes && b.keyQuotes
      ? [...new Set([...a.keyQuotes, ...b.keyQuotes])]
      : a.keyQuotes || b.keyQuotes;

  return {
    id: a.id,
    title: a.title || b.title,
    outlet: a.outlet || b.outlet,
    date: a.date || b.date,
    summary: a.summary.length > b.summary.length ? a.summary : b.summary,
    keyQuotes: mergedQuotes,
    url: a.url,
    sourceContent:
      a.sourceContent.length > b.sourceContent.length
        ? a.sourceContent
        : b.sourceContent,
    confidence: "low", // News sources always have low confidence
  };
}

/**
 * Deduplicate court cases
 */
function deduplicateCourtCases(cases: CourtCase[]): CourtCase[] {
  const deduplicated: CourtCase[] = [];
  const seen = new Set<string>();

  for (const courtCase of cases) {
    // Check if we've seen a duplicate
    let isDuplicate = false;
    let duplicateIndex = -1;

    for (let i = 0; i < deduplicated.length; i++) {
      if (areCourtCasesDuplicate(courtCase, deduplicated[i])) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (isDuplicate && duplicateIndex >= 0) {
      // Merge with existing
      deduplicated[duplicateIndex] = mergeCourtCases(
        deduplicated[duplicateIndex],
        courtCase
      );
    } else {
      // Add new
      deduplicated.push(courtCase);
      seen.add(normalizeUrl(courtCase.url));
    }
  }

  return deduplicated;
}

/**
 * Deduplicate statutes
 */
function deduplicateStatutes(statutes: Statute[]): Statute[] {
  const deduplicated: Statute[] = [];

  for (const statute of statutes) {
    let isDuplicate = false;
    let duplicateIndex = -1;

    for (let i = 0; i < deduplicated.length; i++) {
      if (areStatutesDuplicate(statute, deduplicated[i])) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (isDuplicate && duplicateIndex >= 0) {
      deduplicated[duplicateIndex] = mergeStatutes(
        deduplicated[duplicateIndex],
        statute
      );
    } else {
      deduplicated.push(statute);
    }
  }

  return deduplicated;
}

/**
 * Deduplicate academic sources
 */
function deduplicateAcademicSources(
  sources: AcademicSource[]
): AcademicSource[] {
  const deduplicated: AcademicSource[] = [];

  for (const source of sources) {
    let isDuplicate = false;
    let duplicateIndex = -1;

    for (let i = 0; i < deduplicated.length; i++) {
      if (areAcademicSourcesDuplicate(source, deduplicated[i])) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (isDuplicate && duplicateIndex >= 0) {
      deduplicated[duplicateIndex] = mergeAcademicSources(
        deduplicated[duplicateIndex],
        source
      );
    } else {
      deduplicated.push(source);
    }
  }

  return deduplicated;
}

/**
 * Deduplicate government sources
 */
function deduplicateGovernmentSources(
  sources: GovernmentSource[]
): GovernmentSource[] {
  const deduplicated: GovernmentSource[] = [];

  for (const source of sources) {
    let isDuplicate = false;
    let duplicateIndex = -1;

    for (let i = 0; i < deduplicated.length; i++) {
      if (areGovernmentSourcesDuplicate(source, deduplicated[i])) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (isDuplicate && duplicateIndex >= 0) {
      deduplicated[duplicateIndex] = mergeGovernmentSources(
        deduplicated[duplicateIndex],
        source
      );
    } else {
      deduplicated.push(source);
    }
  }

  return deduplicated;
}

/**
 * Deduplicate news sources
 */
function deduplicateNewsSources(sources: NewsSource[]): NewsSource[] {
  const deduplicated: NewsSource[] = [];

  for (const source of sources) {
    let isDuplicate = false;
    let duplicateIndex = -1;

    for (let i = 0; i < deduplicated.length; i++) {
      if (areNewsSourcesDuplicate(source, deduplicated[i])) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (isDuplicate && duplicateIndex >= 0) {
      deduplicated[duplicateIndex] = mergeNewsSources(
        deduplicated[duplicateIndex],
        source
      );
    } else {
      deduplicated.push(source);
    }
  }

  return deduplicated;
}

/**
 * Merge multiple ExtractedEntities from different research phases
 * Deduplicates entities and merges information from duplicates
 */
export function mergeExtractedEntities(
  entitiesArray: ExtractedEntities[]
): ExtractedEntities {
  console.log(`[Entity Merging] Merging ${entitiesArray.length} entity sets`);

  // Collect all entities
  const allCourtCases: CourtCase[] = [];
  const allStatutes: Statute[] = [];
  const allAcademicSources: AcademicSource[] = [];
  const allGovernmentSources: GovernmentSource[] = [];
  const allNewsSources: NewsSource[] = [];

  for (const entities of entitiesArray) {
    allCourtCases.push(...entities.courtCases);
    allStatutes.push(...entities.statutes);
    allAcademicSources.push(...entities.academicSources);
    allGovernmentSources.push(...entities.governmentSources);
    allNewsSources.push(...entities.newsSources);
  }

  console.log("[Entity Merging] Before deduplication:", {
    courtCases: allCourtCases.length,
    statutes: allStatutes.length,
    academic: allAcademicSources.length,
    government: allGovernmentSources.length,
    news: allNewsSources.length,
  });

  // Deduplicate each type
  const deduplicatedCourtCases = deduplicateCourtCases(allCourtCases);
  const deduplicatedStatutes = deduplicateStatutes(allStatutes);
  const deduplicatedAcademic = deduplicateAcademicSources(allAcademicSources);
  const deduplicatedGovernment =
    deduplicateGovernmentSources(allGovernmentSources);
  const deduplicatedNews = deduplicateNewsSources(allNewsSources);

  console.log("[Entity Merging] After deduplication:", {
    courtCases: deduplicatedCourtCases.length,
    statutes: deduplicatedStatutes.length,
    academic: deduplicatedAcademic.length,
    government: deduplicatedGovernment.length,
    news: deduplicatedNews.length,
    duplicatesRemoved: {
      courtCases: allCourtCases.length - deduplicatedCourtCases.length,
      statutes: allStatutes.length - deduplicatedStatutes.length,
      academic: allAcademicSources.length - deduplicatedAcademic.length,
      government: allGovernmentSources.length - deduplicatedGovernment.length,
      news: allNewsSources.length - deduplicatedNews.length,
    },
  });

  // Sort by confidence (high → medium → low) for reverse re-packing
  // Research-backed: "Reverse configuration achieved best RAG score" (2024)
  const sortByConfidence = <T extends { confidence: string }>(
    items: T[]
  ): T[] => {
    return items.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (
        order[a.confidence as keyof typeof order] -
        order[b.confidence as keyof typeof order]
      );
    });
  };

  return {
    courtCases: sortByConfidence(deduplicatedCourtCases),
    statutes: sortByConfidence(deduplicatedStatutes),
    academicSources: sortByConfidence(deduplicatedAcademic),
    governmentSources: sortByConfidence(deduplicatedGovernment),
    newsSources: sortByConfidence(deduplicatedNews),
    extractionMetadata: {
      totalSources: entitiesArray.reduce(
        (sum, e) => sum + e.extractionMetadata.totalSources,
        0
      ),
      extractedAt: new Date().toISOString(),
      extractionMethod: "merged",
    },
  };
}

/**
 * Reassign entity IDs after merging to ensure uniqueness
 * This is important because merged entities may have duplicate IDs
 */
export function reassignEntityIds(
  entities: ExtractedEntities
): ExtractedEntities {
  let caseCounter = 1;
  let statuteCounter = 1;
  let academicCounter = 1;
  let govCounter = 1;
  let newsCounter = 1;

  return {
    courtCases: entities.courtCases.map((c) => ({
      ...c,
      id: `CASE-${String(caseCounter++).padStart(3, "0")}`,
    })),
    statutes: entities.statutes.map((s) => ({
      ...s,
      id: `STATUTE-${String(statuteCounter++).padStart(3, "0")}`,
    })),
    academicSources: entities.academicSources.map((a) => ({
      ...a,
      id: `ACADEMIC-${String(academicCounter++).padStart(3, "0")}`,
    })),
    governmentSources: entities.governmentSources.map((g) => ({
      ...g,
      id: `GOV-${String(govCounter++).padStart(3, "0")}`,
    })),
    newsSources: entities.newsSources.map((n) => ({
      ...n,
      id: `NEWS-${String(newsCounter++).padStart(3, "0")}`,
    })),
    extractionMetadata: entities.extractionMetadata,
  };
}
