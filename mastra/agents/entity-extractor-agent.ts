/**
 * Entity Extractor Agent
 *
 * Specialized agent for extracting structured legal entities from search results.
 * Uses structured outputs to prevent hallucinations.
 *
 * Research-backed: Entity extraction reduces hallucinations by 42-96% (Industry studies 2024-2025)
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProvider();

/**
 * Entity Extractor Agent
 *
 * Uses qwen-3-235b-a22b-instruct-2507 for superior instruction following
 * and structured output generation.
 */
export const entityExtractorAgent = new Agent({
  name: "Entity Extractor",
  instructions: `You are a specialized legal entity extraction agent for Zimbabwe law.

Your ONLY task is to extract structured legal entities from provided search results.

CRITICAL RULES:
1. ONLY extract information that is EXPLICITLY present in the source content
2. NEVER fabricate case names, citations, or any other information
3. If a field is not available in the source, leave it as undefined/optional
4. Use EXACT URLs from the source - copy character-by-character
5. Generate unique IDs in format: CASE-001, STATUTE-001, ACADEMIC-001, etc.
6. Preserve exact case names, citations, and quotes from source

ENTITY TYPES TO EXTRACT:

1. COURT CASES:
   - Must have case name (X v Y format or "In re X")
   - Extract citation if present (e.g., "[2008] ZWSC 1")
   - Extract court name if mentioned
   - Extract decision date if available
   - Extract holding/principle if stated
   - Extract 2-5 key facts
   - Include relevant excerpt (100-300 words)
   - Mark confidence: high (has citation), medium (no citation but clear case), low (unclear)

2. STATUTES:
   - Extract statute name
   - Extract section/chapter if mentioned
   - Extract relevant text (verbatim from source)
   - Include source URL

3. ACADEMIC SOURCES:
   - Extract title
   - Extract author names
   - Extract publication year
   - Extract 2-5 key findings
   - Extract methodology if mentioned
   - Mark confidence based on source quality

4. GOVERNMENT SOURCES:
   - Extract document title
   - Extract agency/department
   - Extract publication date
   - Extract 2-5 key points
   - Verify .gov.zw domain or official source

5. NEWS SOURCES:
   - Extract headline
   - Extract outlet name
   - Extract publication date
   - Extract summary
   - Extract key quotes if present
   - Always mark confidence as "low"

VALIDATION CHECKS:
- All URLs must start with http:// or https://
- Case names should contain " v " or "In re"
- Citations should match format: [YYYY] or (YYYY) or court codes
- Dates should be ISO format: YYYY-MM-DD
- All entities must have sourceContent for verification

OUTPUT FORMAT:
Return a JSON object matching the ExtractedEntitiesSchema with:
- courtCases: array of court case entities
- statutes: array of statute entities
- academicSources: array of academic source entities
- governmentSources: array of government source entities
- newsSources: array of news source entities
- extractionMetadata: { totalSources, extractedAt, extractionMethod }

REMEMBER: Accuracy > Completeness. If unsure, omit the field rather than guess.`,
  model: () => cerebrasProvider("qwen-3-235b-a22b-instruct-2507"),
  tools: {},
});

/**
 * Generate extraction prompt from search results
 */
export function buildEntityExtractionPrompt(
  results: Array<{
    title: string;
    url: string;
    content: string;
    sourceType?: string;
  }>
): string {
  return `Extract structured legal entities from the following search results.

IMPORTANT: Only extract information that is EXPLICITLY stated in the content below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEARCH RESULTS TO PROCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${results
  .map(
    (result, index) => `
SOURCE ${index + 1}:
Title: ${result.title}
URL: ${result.url}
Type: ${result.sourceType || "unknown"}

Content:
${result.content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}

EXTRACTION TASK:
1. Identify each source type (court case, statute, academic, government, news)
2. Extract structured entities following the schema
3. Generate unique IDs (CASE-001, STATUTE-001, etc.)
4. Copy URLs EXACTLY as provided above
5. Include full sourceContent for each entity
6. Set appropriate confidence levels

CRITICAL REMINDERS:
- If a case name is not in the content, DO NOT create one
- If a citation is not present, leave it undefined
- If author names are not mentioned, leave authors array empty
- Copy all text verbatim - do not paraphrase or invent
- When in doubt, omit the field

Return the extracted entities in JSON format matching ExtractedEntitiesSchema.`;
}
