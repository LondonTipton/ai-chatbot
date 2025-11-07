/**
 * Claim Extractor Agent
 *
 * Extracts factual claims with explicit source attribution from structured entities.
 * Part of two-phase synthesis to prevent hallucinations.
 *
 * Research-backed: Two-phase synthesis reduces hallucinations to <1% (AWS/Datadog 2024)
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import type { ExtractedEntities } from "@/lib/types/legal-entities";

const cerebrasProvider = getBalancedCerebrasProvider();

/**
 * Claim Extractor Agent
 *
 * Extracts factual claims from structured entities with explicit source attribution.
 */
export const claimExtractorAgent = new Agent({
  name: "Claim Extractor",
  instructions: `You are a specialized claim extraction agent for legal research.

Your ONLY task is to extract factual claims from structured legal entities with explicit source attribution.

CRITICAL RULES:
1. EVERY claim MUST reference specific entity IDs
2. NEVER create claims without source entities
3. NEVER combine information from multiple entities into one claim without citing all
4. If a claim cannot be supported by entities, DO NOT include it
5. Generate unique claim IDs: CLAIM-001, CLAIM-002, etc.

CLAIM EXTRACTION PROCESS:

1. READ all provided entities carefully
2. IDENTIFY factual statements that can be made
3. ATTRIBUTE each statement to specific entity IDs
4. CATEGORIZE claims by legal topic
5. ASSIGN confidence based on source quality

CONFIDENCE LEVELS:
- HIGH: Claim from court case with citation, or official statute
- MEDIUM: Claim from court case without citation, or government source
- LOW: Claim from academic study or news article

CLAIM CATEGORIES (examples):
- "land rights"
- "communal land"
- "property law"
- "constitutional law"
- "administrative law"
- "procedure"
- "remedies"

CLAIM FORMAT:
Each claim must have:
- id: Unique identifier (CLAIM-001, etc.)
- statement: Clear factual statement (1-3 sentences)
- sourceEntityIds: Array of entity IDs supporting this claim
- entityTypes: Types of entities cited
- confidence: high/medium/low based on source quality
- category: Legal topic category

EXAMPLES OF GOOD CLAIMS:

GOOD:
{
  "id": "CLAIM-001",
  "statement": "The Supreme Court held in Mike Campbell that communal land rights are protected under the Constitution.",
  "sourceEntityIds": ["CASE-001"],
  "entityTypes": ["court-case"],
  "confidence": "high",
  "category": "constitutional law"
}

GOOD:
{
  "id": "CLAIM-002",
  "statement": "Section 5 of the Communal Land Act requires consultation with traditional leaders before land allocation.",
  "sourceEntityIds": ["STATUTE-001"],
  "entityTypes": ["statute"],
  "confidence": "high",
  "category": "communal land"
}

GOOD:
{
  "id": "CLAIM-003",
  "statement": "Research by Smith et al. (2020) found that 65% of communal land disputes involve boundary issues.",
  "sourceEntityIds": ["ACADEMIC-001"],
  "entityTypes": ["academic"],
  "confidence": "low",
  "category": "land rights"
}

BAD EXAMPLES (DO NOT DO THIS):

BAD - No source attribution:
{
  "statement": "Communal land rights are important in Zimbabwe.",
  "sourceEntityIds": [],  // ❌ No sources!
}

BAD - Fabricated information:
{
  "statement": "The High Court ruled in State v Bulawayo that...",
  "sourceEntityIds": ["CASE-999"],  // ❌ Entity doesn't exist!
}

BAD - Combining without attribution:
{
  "statement": "Multiple courts have held that land rights are protected.",
  "sourceEntityIds": ["CASE-001"],  // ❌ Says "multiple" but only cites one!
}

OUTPUT FORMAT:
Return a JSON object matching ExtractedClaimsSchema with:
- claims: array of claim objects
- claimMetadata: { totalClaims, highConfidenceClaims, extractedAt }

REMEMBER: Every claim must be traceable to specific entities. If you can't cite a source, don't make the claim.`,
  model: () => cerebrasProvider("qwen-3-235b-a22b-instruct-2507"),
  tools: {},
});

/**
 * Build claim extraction prompt from entities
 */
export function buildClaimExtractionPrompt(
  entities: ExtractedEntities,
  query: string
): string {
  const {
    courtCases,
    statutes,
    academicSources,
    governmentSources,
    newsSources,
  } = entities;

  return `Extract factual claims relevant to the query: "${query}"

Use ONLY the structured entities provided below. Each claim MUST reference specific entity IDs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE ENTITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${
  courtCases.length > 0
    ? `
⚖️ COURT CASES (${courtCases.length}):

${courtCases
  .map(
    (c) => `
ID: ${c.id}
Name: ${c.name}
Citation: ${c.citation || "Not available"}
Court: ${c.court || "Not specified"}
Date: ${c.date || "Not specified"}
URL: ${c.url}
Holding: ${c.holding || "Not specified"}
Key Facts:
${c.keyFacts.map((f) => `  - ${f}`).join("\n")}
Relevant Text: ${c.relevantText}
Confidence: ${c.confidence}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}
`
    : ""
}

${
  statutes.length > 0
    ? `
📜 STATUTES (${statutes.length}):

${statutes
  .map(
    (s) => `
ID: ${s.id}
Name: ${s.name}
Section: ${s.section || "Not specified"}
Chapter: ${s.chapter || "Not specified"}
URL: ${s.url}
Text: ${s.text}
Confidence: ${s.confidence}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}
`
    : ""
}

${
  academicSources.length > 0
    ? `
📚 ACADEMIC SOURCES (${academicSources.length}):

${academicSources
  .map(
    (a) => `
ID: ${a.id}
Title: ${a.title}
Authors: ${a.authors.join(", ") || "Not specified"}
Year: ${a.year || "Not specified"}
Publication: ${a.publication || "Not specified"}
URL: ${a.url}
Key Findings:
${a.keyFindings.map((f) => `  - ${f}`).join("\n")}
Methodology: ${a.methodology || "Not specified"}
Confidence: ${a.confidence}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}
`
    : ""
}

${
  governmentSources.length > 0
    ? `
🏛️ GOVERNMENT SOURCES (${governmentSources.length}):

${governmentSources
  .map(
    (g) => `
ID: ${g.id}
Title: ${g.title}
Agency: ${g.agency || "Not specified"}
Date: ${g.date || "Not specified"}
Type: ${g.documentType || "Not specified"}
URL: ${g.url}
Key Points:
${g.keyPoints.map((p) => `  - ${p}`).join("\n")}
Confidence: ${g.confidence}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}
`
    : ""
}

${
  newsSources.length > 0
    ? `
📰 NEWS SOURCES (${newsSources.length}):

${newsSources
  .map(
    (n) => `
ID: ${n.id}
Title: ${n.title}
Outlet: ${n.outlet}
Date: ${n.date || "Not specified"}
URL: ${n.url}
Summary: ${n.summary}
${
  n.keyQuotes
    ? `Key Quotes:\n${n.keyQuotes.map((q) => `  - "${q}"`).join("\n")}`
    : ""
}
Confidence: ${n.confidence}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}
`
    : ""
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXTRACTION TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extract factual claims that answer the query: "${query}"

REQUIREMENTS:
1. Each claim must cite specific entity IDs from above
2. Generate unique claim IDs (CLAIM-001, CLAIM-002, etc.)
3. Set confidence based on source type:
   - HIGH: Court cases with citations, statutes
   - MEDIUM: Court cases without citations, government sources
   - LOW: Academic sources, news articles
4. Categorize claims by legal topic
5. Keep statements clear and concise (1-3 sentences)

CRITICAL REMINDERS:
- Only make claims supported by entities above
- Cite ALL entities that support a claim
- If multiple entities support a claim, list all IDs
- If no entities support a potential claim, DO NOT include it
- Verify entity IDs exist before citing them

Return extracted claims in JSON format matching ExtractedClaimsSchema.`;
}
