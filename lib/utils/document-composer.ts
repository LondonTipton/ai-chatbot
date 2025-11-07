/**
 * Document Composer Utilities
 *
 * Composes final documents from validated claims and entities.
 * Part of two-phase synthesis to ensure all claims are sourced.
 */

import type {
  AcademicSource,
  Claim,
  CourtCase,
  ExtractedEntities,
  GovernmentSource,
  NewsSource,
  Statute,
} from "@/lib/types/legal-entities";

/**
 * Entity lookup map for fast access
 */
type EntityMap = {
  courtCases: Map<string, CourtCase>;
  statutes: Map<string, Statute>;
  academicSources: Map<string, AcademicSource>;
  governmentSources: Map<string, GovernmentSource>;
  newsSources: Map<string, NewsSource>;
};

/**
 * Create entity lookup map
 */
export function createEntityMap(entities: ExtractedEntities): EntityMap {
  return {
    courtCases: new Map(entities.courtCases.map((c) => [c.id, c])),
    statutes: new Map(entities.statutes.map((s) => [s.id, s])),
    academicSources: new Map(entities.academicSources.map((a) => [a.id, a])),
    governmentSources: new Map(
      entities.governmentSources.map((g) => [g.id, g])
    ),
    newsSources: new Map(entities.newsSources.map((n) => [n.id, n])),
  };
}

/**
 * Get entity by ID from map
 */
export function getEntityById(
  entityId: string,
  entityMap: EntityMap
):
  | CourtCase
  | Statute
  | AcademicSource
  | GovernmentSource
  | NewsSource
  | undefined {
  if (entityId.startsWith("CASE-")) {
    return entityMap.courtCases.get(entityId);
  }
  if (entityId.startsWith("STATUTE-")) {
    return entityMap.statutes.get(entityId);
  }
  if (entityId.startsWith("ACADEMIC-")) {
    return entityMap.academicSources.get(entityId);
  }
  if (entityId.startsWith("GOV-")) {
    return entityMap.governmentSources.get(entityId);
  }
  if (entityId.startsWith("NEWS-")) {
    return entityMap.newsSources.get(entityId);
  }
  return;
}

/**
 * Validate that all claims have valid source entities
 */
export function validateClaims(
  claims: Claim[],
  entityMap: EntityMap
): { validClaims: Claim[]; invalidClaims: Claim[] } {
  const validClaims: Claim[] = [];
  const invalidClaims: Claim[] = [];

  for (const claim of claims) {
    // Check if all source entity IDs exist
    const allSourcesExist = claim.sourceEntityIds.every((id) =>
      getEntityById(id, entityMap)
    );

    if (allSourcesExist && claim.sourceEntityIds.length > 0) {
      validClaims.push(claim);
    } else {
      invalidClaims.push(claim);
    }
  }

  return { validClaims, invalidClaims };
}

/**
 * Format entity citation for inline use
 */
export function formatEntityCitation(
  entityId: string,
  entityMap: EntityMap
): string {
  const entity = getEntityById(entityId, entityMap);
  if (!entity) {
    return `[Source: ${entityId}]`;
  }

  if (entityId.startsWith("CASE-")) {
    const courtCase = entity as CourtCase;
    return `[Source: ${courtCase.name}${
      courtCase.citation ? ` ${courtCase.citation}` : ""
    } - ${courtCase.url}]`;
  }
  if (entityId.startsWith("STATUTE-")) {
    const statute = entity as Statute;
    return `[Source: ${statute.name}${
      statute.section ? ` ${statute.section}` : ""
    } - ${statute.url}]`;
  }
  if (entityId.startsWith("ACADEMIC-")) {
    const academic = entity as AcademicSource;
    return `[Source: ${academic.title} (${academic.year || "n.d."}) - ${
      academic.url
    }]`;
  }
  if (entityId.startsWith("GOV-")) {
    const gov = entity as GovernmentSource;
    return `[Source: ${gov.title} - ${gov.url}]`;
  }
  if (entityId.startsWith("NEWS-")) {
    const news = entity as NewsSource;
    return `[Source: ${news.outlet} - ${news.title} - ${news.url}]`;
  }

  return `[Source: ${entityId}]`;
}

/**
 * Format claim with inline citations
 */
export function formatClaimWithCitations(
  claim: Claim,
  entityMap: EntityMap
): string {
  const citations = claim.sourceEntityIds
    .map((id) => formatEntityCitation(id, entityMap))
    .join(" ");

  return `${claim.statement} ${citations}`;
}

/**
 * Group claims by category
 */
export function groupClaimsByCategory(claims: Claim[]): Map<string, Claim[]> {
  const grouped = new Map<string, Claim[]>();

  for (const claim of claims) {
    const category = claim.category || "Other";
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    const categoryArray = grouped.get(category);
    if (categoryArray) {
      categoryArray.push(claim);
    } else {
      // This should never happen since we just set it, but TypeScript needs this
      grouped.set(category, [claim]);
    }
  }

  return grouped;
}

/**
 * Group claims by confidence
 */
export function groupClaimsByConfidence(claims: Claim[]): {
  high: Claim[];
  medium: Claim[];
  low: Claim[];
} {
  return {
    high: claims.filter((c) => c.confidence === "high"),
    medium: claims.filter((c) => c.confidence === "medium"),
    low: claims.filter((c) => c.confidence === "low"),
  };
}

/**
 * Build structured synthesis prompt from claims and entities
 */
export function buildSynthesisPrompt(
  query: string,
  claims: Claim[],
  entities: ExtractedEntities
): string {
  const entityMap = createEntityMap(entities);
  const { validClaims } = validateClaims(claims, entityMap);
  const claimsByCategory = groupClaimsByCategory(validClaims);
  const claimsByConfidence = groupClaimsByConfidence(validClaims);

  const prompt = `Compose a comprehensive legal research document for: "${query}"

You have ${validClaims.length} validated claims with source attribution.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CLAIM STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Claims: ${validClaims.length}
High Confidence: ${
    claimsByConfidence.high.length
  } (court cases with citations, statutes)
Medium Confidence: ${
    claimsByConfidence.medium.length
  } (court cases without citations, government sources)
Low Confidence: ${
    claimsByConfidence.low.length
  } (academic sources, news articles)

Categories: ${Array.from(claimsByCategory.keys()).join(", ")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 VALIDATED CLAIMS (All claims below have verified source attribution)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${Array.from(claimsByCategory.entries())
  .map(
    ([category, categoryClaims]) => `
## ${category.toUpperCase()}

${categoryClaims
  .map(
    (claim, idx) => `
${idx + 1}. ${formatClaimWithCitations(claim, entityMap)}
   Confidence: ${claim.confidence.toUpperCase()}
   Claim ID: ${claim.id}
`
  )
  .join("\n")}
`
  )
  .join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 COMPOSITION TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Compose a professional legal research document using ONLY the validated claims above.

CRITICAL RULES:
1. ONLY use claims listed above - they are already validated and sourced
2. DO NOT add any information not in the claims
3. DO NOT remove or modify the source citations
4. Organize claims logically by category and importance
5. Maintain all [Source: ...] citations exactly as provided
6. Use professional legal writing style appropriate for Zimbabwe

REQUIRED DOCUMENT STRUCTURE:

1. **Executive Summary**
   - Brief overview of key findings (2-3 paragraphs)
   - Highlight most important high-confidence claims
   - Include inline citations

2. **Key Findings by Category**
   - Organize by legal categories
   - Present high-confidence claims first
   - Include all source citations
   - Use clear headings and bullet points

3. **Detailed Analysis**
   - Expand on key findings with context
   - Explain relationships between claims
   - Note any conflicting information
   - Maintain all citations

4. **Source Quality Assessment**
   - Summarize confidence levels
   - Note which claims are from primary sources (court cases, statutes)
   - Note which are from secondary sources (academic, news)

5. **Limitations and Gaps**
   - Explicitly state what the research does NOT cover
   - Note areas where only low-confidence sources are available
   - Suggest areas for further research

6. **Complete Source List**
   - List all sources by type
   - Include full URLs
   - Organize by confidence level

WRITING GUIDELINES:
- Professional tone appropriate for legal research
- Clear, concise language
- Proper markdown formatting
- Preserve ALL source citations
- Use exact claim text - do not paraphrase
- When combining claims, cite all relevant sources

ABSOLUTE RULE:
Every factual statement in your document MUST come from the validated claims above.
If a claim is not listed, you CANNOT include it in the document.

Begin composing the document now.`;

  return prompt;
}

/**
 * Build source list section
 */
export function buildSourceList(entities: ExtractedEntities): string {
  const {
    courtCases,
    statutes,
    academicSources,
    governmentSources,
    newsSources,
  } = entities;

  let sourceList = "# Complete Source List\n\n";

  if (courtCases.length > 0) {
    sourceList += "## Court Cases (Primary Authority)\n\n";
    courtCases.forEach((c, idx) => {
      sourceList += `${idx + 1}. **${c.name}**${
        c.citation ? ` ${c.citation}` : ""
      }\n`;
      sourceList += `   - Court: ${c.court || "Not specified"}\n`;
      sourceList += `   - Date: ${c.date || "Not specified"}\n`;
      sourceList += `   - URL: ${c.url}\n`;
      sourceList += `   - Confidence: ${c.confidence}\n\n`;
    });
  }

  if (statutes.length > 0) {
    sourceList += "## Statutes and Legislation\n\n";
    statutes.forEach((s, idx) => {
      sourceList += `${idx + 1}. **${s.name}**${
        s.section ? ` ${s.section}` : ""
      }\n`;
      sourceList += `   - Chapter: ${s.chapter || "Not specified"}\n`;
      sourceList += `   - URL: ${s.url}\n`;
      sourceList += `   - Confidence: ${s.confidence}\n\n`;
    });
  }

  if (governmentSources.length > 0) {
    sourceList += "## Government Sources\n\n";
    governmentSources.forEach((g, idx) => {
      sourceList += `${idx + 1}. **${g.title}**\n`;
      sourceList += `   - Agency: ${g.agency || "Not specified"}\n`;
      sourceList += `   - Date: ${g.date || "Not specified"}\n`;
      sourceList += `   - URL: ${g.url}\n`;
      sourceList += `   - Confidence: ${g.confidence}\n\n`;
    });
  }

  if (academicSources.length > 0) {
    sourceList += "## Academic Sources (Secondary)\n\n";
    academicSources.forEach((a, idx) => {
      sourceList += `${idx + 1}. **${a.title}**\n`;
      sourceList += `   - Authors: ${
        a.authors.join(", ") || "Not specified"
      }\n`;
      sourceList += `   - Year: ${a.year || "Not specified"}\n`;
      sourceList += `   - Publication: ${a.publication || "Not specified"}\n`;
      sourceList += `   - URL: ${a.url}\n`;
      sourceList += `   - Confidence: ${a.confidence}\n\n`;
    });
  }

  if (newsSources.length > 0) {
    sourceList += "## News Sources (Tertiary)\n\n";
    newsSources.forEach((n, idx) => {
      sourceList += `${idx + 1}. **${n.title}**\n`;
      sourceList += `   - Outlet: ${n.outlet}\n`;
      sourceList += `   - Date: ${n.date || "Not specified"}\n`;
      sourceList += `   - URL: ${n.url}\n`;
      sourceList += `   - Confidence: ${n.confidence}\n\n`;
    });
  }

  return sourceList;
}
