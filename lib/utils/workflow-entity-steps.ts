/**
 * Shared Workflow Entity Extraction Steps
 *
 * Reusable steps for entity extraction, validation, claim extraction, and document composition.
 * Can be imported and used by any workflow to add structured entity support.
 */

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import {
  ExtractedClaimsSchema,
  ExtractedEntitiesSchema,
  ValidatedEntitiesSchema,
} from "@/lib/types/legal-entities";
import {
  buildSynthesisPrompt,
  createEntityMap,
  validateClaims,
} from "@/lib/utils/document-composer";
import { validateExtractedEntities } from "@/lib/utils/entity-validation";
import {
  buildClaimExtractionPrompt,
  claimExtractorAgent,
} from "@/mastra/agents/claim-extractor-agent";
import {
  buildEntityExtractionPrompt,
  entityExtractorAgent,
} from "@/mastra/agents/entity-extractor-agent";
import { synthesizerAgent } from "@/mastra/agents/synthesizer-agent";

/**
 * Generic result type for search results
 */
export const SearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),
  score: z.number().optional(),
  relevanceScore: z.number().optional(),
  publishedDate: z.string().optional(),
  position: z.number().optional(),
  sourceType: z
    .enum(["court-case", "academic", "news", "government", "other"])
    .optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Create entity extraction step
 * Can be used in any workflow after search results are available
 */
export function createEntityExtractionStep(stepId = "extract-entities") {
  return createStep({
    id: stepId,
    description: "Extract structured legal entities from search results",
    inputSchema: z
      .object({
        results: z.array(SearchResultSchema),
        answer: z.string().optional(),
        tokenEstimate: z.number().optional(),
      })
      .passthrough(), // Allow additional fields
    outputSchema: z
      .object({
        entities: ExtractedEntitiesSchema,
        results: z.array(SearchResultSchema),
        answer: z.string().optional(),
        tokenEstimate: z.number().optional(),
      })
      .passthrough(),
    execute: async ({ inputData }) => {
      const { results, answer, tokenEstimate, ...rest } = inputData;

      try {
        console.log(
          `[${stepId}] Extracting structured entities from ${results.length} results`
        );

        // Build extraction prompt
        const extractionPrompt = buildEntityExtractionPrompt(results);

        // Extract entities
        const extracted = await entityExtractorAgent.generate(
          extractionPrompt,
          {
            maxSteps: 1,
          }
        );

        // Parse structured output
        const entities = ExtractedEntitiesSchema.parse(
          JSON.parse(extracted.text)
        );

        console.log(`[${stepId}] Entities extracted:`, {
          courtCases: entities.courtCases.length,
          statutes: entities.statutes.length,
          academic: entities.academicSources.length,
          government: entities.governmentSources.length,
          news: entities.newsSources.length,
        });

        return {
          ...rest,
          entities,
          results,
          answer,
          tokenEstimate,
        };
      } catch (error) {
        console.error(`[${stepId}] Entity extraction error:`, error);

        // Fallback: return empty entities
        return {
          ...rest,
          entities: {
            courtCases: [],
            statutes: [],
            academicSources: [],
            governmentSources: [],
            newsSources: [],
            extractionMetadata: {
              totalSources: results.length,
              extractedAt: new Date().toISOString(),
              extractionMethod: "failed",
            },
          },
          results,
          answer,
          tokenEstimate,
        };
      }
    },
  });
}

/**
 * Create entity validation step
 */
export function createEntityValidationStep(stepId = "validate-entities") {
  return createStep({
    id: stepId,
    description: "Validate extracted entities",
    inputSchema: z
      .object({
        entities: ExtractedEntitiesSchema,
      })
      .passthrough(),
    outputSchema: z
      .object({
        validatedEntities: ValidatedEntitiesSchema,
      })
      .passthrough(),
    execute: async ({ inputData }) => {
      const { entities, ...rest } = inputData;

      try {
        console.log(`[${stepId}] Validating entities`);

        // Validate entities (synchronous operation wrapped in async)
        const validated = await Promise.resolve(
          validateExtractedEntities(entities)
        );

        console.log(`[${stepId}] Validation complete:`, {
          totalEntities: validated.validationMetadata.totalEntities,
          validEntities: validated.validationMetadata.validEntities,
          invalidEntities: validated.validationMetadata.invalidEntities,
          errors: validated.issues.filter((i) => i.severity === "error").length,
          warnings: validated.issues.filter((i) => i.severity === "warning")
            .length,
        });

        return {
          ...rest,
          validatedEntities: validated,
        };
      } catch (error) {
        console.error(`[${stepId}] Validation error:`, error);

        // Fallback: mark all as valid
        return {
          ...rest,
          validatedEntities: {
            valid: entities,
            issues: [],
            validationMetadata: {
              totalEntities: 0,
              validEntities: 0,
              invalidEntities: 0,
              validatedAt: new Date().toISOString(),
            },
          },
        };
      }
    },
  });
}

/**
 * Create claim extraction step
 */
export function createClaimExtractionStep(stepId = "extract-claims") {
  return createStep({
    id: stepId,
    description: "Extract factual claims with source attribution",
    inputSchema: z
      .object({
        validatedEntities: ValidatedEntitiesSchema,
      })
      .passthrough(),
    outputSchema: z
      .object({
        claims: ExtractedClaimsSchema,
        validatedEntities: ValidatedEntitiesSchema,
      })
      .passthrough(),
    execute: async ({ inputData, getInitData }) => {
      const { validatedEntities, ...rest } = inputData;
      const initData = getInitData();
      const { query } = initData;

      try {
        console.log(`[${stepId}] Extracting claims`);

        // Build claim extraction prompt
        const claimPrompt = buildClaimExtractionPrompt(
          validatedEntities.valid,
          query
        );

        // Extract claims
        const extracted = await claimExtractorAgent.generate(claimPrompt, {
          maxSteps: 1,
        });

        // Parse structured output
        const claims = ExtractedClaimsSchema.parse(JSON.parse(extracted.text));

        console.log(`[${stepId}] Claims extracted:`, {
          totalClaims: claims.claims.length,
          highConfidence: claims.claims.filter((c) => c.confidence === "high")
            .length,
        });

        return {
          ...rest,
          validatedEntities,
          claims,
        };
      } catch (error) {
        console.error(`[${stepId}] Claim extraction error:`, error);

        // Fallback: return empty claims
        return {
          ...rest,
          validatedEntities,
          claims: {
            claims: [],
            claimMetadata: {
              totalClaims: 0,
              highConfidenceClaims: 0,
              extractedAt: new Date().toISOString(),
            },
          },
        };
      }
    },
  });
}

/**
 * Create document composition step
 */
export function createDocumentCompositionStep(stepId = "compose-document") {
  return createStep({
    id: stepId,
    description: "Compose final document from validated claims",
    inputSchema: z
      .object({
        validatedEntities: ValidatedEntitiesSchema,
        claims: ExtractedClaimsSchema,
        tokenEstimate: z.number().optional(),
      })
      .passthrough(),
    outputSchema: z.object({
      response: z.string().describe("Synthesized comprehensive response"),
      sources: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
          })
        )
        .describe("Source citations"),
      totalTokens: z.number().describe("Total tokens used in workflow"),
    }),
    execute: async ({ inputData, getInitData }) => {
      const {
        validatedEntities,
        claims,
        tokenEstimate = 0,
        ...rest
      } = inputData;
      const initData = getInitData();
      const { query } = initData;

      try {
        console.log(`[${stepId}] Composing document from claims`);

        // Validate claims against entities
        const entityMap = createEntityMap(validatedEntities.valid);
        const { validClaims, invalidClaims } = validateClaims(
          claims.claims,
          entityMap
        );

        if (invalidClaims.length > 0) {
          console.warn(
            `[${stepId}] ${invalidClaims.length} claims have invalid source references`
          );
        }

        // Build synthesis prompt with validated claims
        const synthesisPrompt = buildSynthesisPrompt(
          query,
          validClaims,
          validatedEntities.valid
        );

        // Generate document
        const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
          maxSteps: 1,
        });

        // Extract sources from entities
        const sources: Array<{ title: string; url: string }> = [];

        for (const c of validatedEntities.valid.courtCases) {
          sources.push({
            title: `${c.name}${c.citation ? ` ${c.citation}` : ""}`,
            url: c.url,
          });
        }

        for (const s of validatedEntities.valid.statutes) {
          sources.push({
            title: `${s.name}${s.section ? ` ${s.section}` : ""}`,
            url: s.url,
          });
        }

        for (const a of validatedEntities.valid.academicSources) {
          sources.push({
            title: a.title,
            url: a.url,
          });
        }

        for (const g of validatedEntities.valid.governmentSources) {
          sources.push({
            title: g.title,
            url: g.url,
          });
        }

        for (const n of validatedEntities.valid.newsSources) {
          sources.push({
            title: n.title,
            url: n.url,
          });
        }

        // Estimate synthesis tokens
        const synthesisTokens = Math.ceil(synthesized.text.length / 4);
        const totalTokens = tokenEstimate + synthesisTokens;

        console.log(`[${stepId}] Document composition complete:`, {
          validClaims: validClaims.length,
          invalidClaims: invalidClaims.length,
          sources: sources.length,
          synthesisTokens,
          totalTokens,
        });

        return {
          response: synthesized.text,
          sources,
          totalTokens,
        };
      } catch (error) {
        console.error(`[${stepId}] Document composition error:`, error);

        // Fallback: return basic response
        const fallbackResponse =
          "Unable to generate response. Please try again.";

        const sources: Array<{ title: string; url: string }> = [];
        for (const c of validatedEntities.valid.courtCases) {
          sources.push({ title: c.name, url: c.url });
        }

        return {
          response: fallbackResponse,
          sources,
          totalTokens: tokenEstimate,
        };
      }
    },
  });
}

/**
 * Create complete entity pipeline (all 4 steps)
 * Returns array of steps that can be chained in workflow
 */
export function createEntityPipeline(prefix = "") {
  return [
    createEntityExtractionStep(
      prefix ? `${prefix}-extract-entities` : "extract-entities"
    ),
    createEntityValidationStep(
      prefix ? `${prefix}-validate-entities` : "validate-entities"
    ),
    createClaimExtractionStep(
      prefix ? `${prefix}-extract-claims` : "extract-claims"
    ),
    createDocumentCompositionStep(
      prefix ? `${prefix}-compose-document` : "compose-document"
    ),
  ];
}
