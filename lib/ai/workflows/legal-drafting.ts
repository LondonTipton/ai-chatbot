import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { ensureAgentResponse, handleAgentError } from "../agent-helpers";
import { draftAgent } from "../agents/draft-agent";
import { refineAgent } from "../agents/refine-agent";
import { researchAgent } from "../agents/research-agent";

const logger = createLogger("workflows/legal-drafting");

/**
 * Legal Drafting Workflow
 *
 * This workflow orchestrates a three-step legal document drafting process:
 * 1. Research Agent: Researches relevant provisions, precedents, and requirements
 * 2. Draft Agent: Creates initial document structure and content
 * 3. Refine Agent: Refines and finalizes the document to professional standards
 *
 * Each agent is limited to 3 steps maximum to work within provider limitations.
 *
 * Note: Mastra 0.20.2 doesn't support the Workflow/Step pattern, so this
 * implementation uses sequential agent calls with manual data passing.
 *
 * Requirements:
 * - 6.1: Route drafting queries to Legal Drafting Workflow
 * - 6.2: First step researches provisions and precedents (max 3 steps)
 * - 6.3: Second step drafts document structure (max 3 steps)
 * - 6.4: Third step refines and finalizes document (max 3 steps)
 * - 6.5: Create document artifact with final draft
 *
 * Usage:
 * ```typescript
 * const result = await executeLegalDrafting(
 *   "Draft an employment contract for a software developer in Zimbabwe",
 *   { userId: "123", chatId: "456" }
 * );
 * ```
 */

// Define the workflow input schema
const legalDraftingInputSchema = z.object({
  query: z.string().describe("The document drafting request"),
  context: z
    .object({
      userId: z.string().optional(),
      chatId: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional()
    .describe("Additional context for the drafting"),
});

// Define the workflow output schema
const legalDraftingOutputSchema = z.object({
  success: z.boolean().describe("Whether the workflow completed successfully"),
  response: z
    .string()
    .describe("The final document or summary of the drafting process"),
  documentId: z
    .string()
    .optional()
    .describe("ID of the created document artifact"),
  steps: z
    .array(
      z.object({
        agent: z.string().describe("The agent that executed this step"),
        duration: z.number().optional().describe("Step execution time in ms"),
        output: z.any().describe("The step output"),
        error: z.string().optional().describe("Error message if step failed"),
      })
    )
    .describe("Details of each workflow step"),
  duration: z.number().optional().describe("Total workflow duration in ms"),
  agentsUsed: z.number().describe("Number of agents used in the workflow"),
});

/**
 * Execute the Legal Drafting Workflow
 *
 * This function orchestrates the three-step workflow by calling agents sequentially
 * and passing data between them. Each agent is limited to 3 steps.
 *
 * @param query - The document drafting request
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Workflow result with success status, response, and step details
 */
export async function executeLegalDrafting(
  query: string,
  context?: {
    userId?: string;
    chatId?: string;
    sessionId?: string;
  }
) {
  const startTime = Date.now();
  const steps: Array<{
    agent: string;
    duration?: number;
    output: string;
    error?: string;
  }> = [];

  logger.log("[Legal Drafting Workflow] Starting workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Step 1: Research Agent
    logger.log("[Legal Drafting Workflow] Step 1/3: Research Agent");
    const researchStartTime = Date.now();

    let researchFindings = "";
    try {
      const researchResponse = await researchAgent.generate(query);
      researchFindings = researchResponse.text || "";
      const researchDuration = Date.now() - researchStartTime;

      steps.push({
        agent: researchAgent.name,
        duration: researchDuration,
        output: researchFindings,
      });

      logger.log("[Legal Drafting Workflow] Research Agent completed", {
        duration: `${researchDuration}ms`,
        outputLength: researchFindings.length,
      });
    } catch (error) {
      const researchDuration = Date.now() - researchStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: researchAgent.name,
        duration: researchDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Legal Drafting Workflow] Research Agent failed", {
        error: errorMessage,
        duration: `${researchDuration}ms`,
      });

      throw new Error(`Research step failed: ${errorMessage}`);
    }

    // Step 2: Draft Agent
    logger.log("[Legal Drafting Workflow] Step 2/3: Draft Agent");
    const draftStartTime = Date.now();

    let draftDocument = "";
    try {
      // Pass research findings to draft agent
      const draftPrompt = `Based on the following research findings, draft the requested legal document:\n\nOriginal Request: ${query}\n\nResearch Findings:\n${researchFindings}\n\nCreate a complete, well-structured document with all required sections and provisions.`;
      const draftResponse = await draftAgent.generate(draftPrompt);
      draftDocument = draftResponse.text || "";
      const draftDuration = Date.now() - draftStartTime;

      steps.push({
        agent: draftAgent.name,
        duration: draftDuration,
        output: draftDocument,
      });

      logger.log("[Legal Drafting Workflow] Draft Agent completed", {
        duration: `${draftDuration}ms`,
        outputLength: draftDocument.length,
      });
    } catch (error) {
      const draftDuration = Date.now() - draftStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: draftAgent.name,
        duration: draftDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Legal Drafting Workflow] Draft Agent failed", {
        error: errorMessage,
        duration: `${draftDuration}ms`,
      });

      // Continue with partial results from research
      logger.log(
        "[Legal Drafting Workflow] Continuing with research findings only"
      );
      draftDocument = researchFindings;
    }

    // Step 3: Refine Agent
    logger.log("[Legal Drafting Workflow] Step 3/3: Refine Agent");
    const refineStartTime = Date.now();

    let finalResponse = "";
    try {
      // Pass draft document to refine agent
      const refinePrompt = `Refine and finalize the following document draft:\n\nOriginal Request: ${query}\n\nResearch Findings:\n${researchFindings}\n\nDraft Document:\n${draftDocument}\n\nProvide the final, polished version of the document.`;
      const refineResponse = await refineAgent.generate(refinePrompt);
      finalResponse = refineResponse.text || "";
      const refineDuration = Date.now() - refineStartTime;

      steps.push({
        agent: refineAgent.name,
        duration: refineDuration,
        output: finalResponse,
      });

      logger.log("[Legal Drafting Workflow] Refine Agent completed", {
        duration: `${refineDuration}ms`,
        outputLength: finalResponse.length,
      });
    } catch (error) {
      const refineDuration = Date.now() - refineStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: refineAgent.name,
        duration: refineDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Legal Drafting Workflow] Refine Agent failed", {
        error: errorMessage,
        duration: `${refineDuration}ms`,
      });

      throw new Error(`Refinement step failed: ${errorMessage}`);
    }

    const duration = Date.now() - startTime;

    logger.log("[Legal Drafting Workflow] Workflow completed successfully", {
      duration: `${duration}ms`,
      stepsCompleted: steps.length,
      responseLength: finalResponse.length,
    });

    return {
      success: true,
      response: finalResponse,
      steps,
      duration,
      agentsUsed: 3,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[Legal Drafting Workflow] Workflow failed", {
      error: errorMessage,
      duration: `${duration}ms`,
      stepsCompleted: steps.length,
    });

    return {
      success: false,
      response: "",
      steps,
      duration,
      agentsUsed: steps.filter((s) => !s.error).length,
    };
  }
}

/**
 * Stream the Legal Drafting Workflow
 *
 * This function provides streaming support for the workflow, allowing
 * real-time updates as each agent completes its work.
 *
 * @param query - The document drafting request
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Async generator yielding workflow progress updates
 */
export async function* streamLegalDrafting(
  query: string,
  context?: {
    userId?: string;
    chatId?: string;
    sessionId?: string;
  }
) {
  const startTime = Date.now();

  logger.log("[Legal Drafting Workflow] Starting streaming workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Yield initial progress
    yield {
      type: "progress" as const,
      step: 1,
      totalSteps: 3,
      agent: researchAgent.name,
      message: "Researching legal requirements and precedents...",
    };

    // Step 1: Research Agent
    let researchFindings = "";
    try {
      const researchResponse = await researchAgent.generate(query);
      researchFindings = researchResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield {
        type: "error" as const,
        error: `Research step failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
      return;
    }

    // Yield progress after research
    yield {
      type: "progress" as const,
      step: 2,
      totalSteps: 3,
      agent: draftAgent.name,
      message: "Drafting document structure and content...",
    };

    // Step 2: Draft Agent
    let draftDocument = "";
    try {
      const draftPrompt = `Based on the following research findings, draft the requested legal document:\n\nOriginal Request: ${query}\n\nResearch Findings:\n${researchFindings}\n\nCreate a complete, well-structured document with all required sections and provisions.`;
      const draftResponse = await draftAgent.generate(draftPrompt);
      draftDocument = draftResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        "[Legal Drafting Workflow] Draft failed, continuing with research findings",
        { error: errorMessage }
      );
      draftDocument = researchFindings;
    }

    // Yield progress after draft
    yield {
      type: "progress" as const,
      step: 3,
      totalSteps: 3,
      agent: refineAgent.name,
      message: "Refining and finalizing document...",
    };

    // Step 3: Refine Agent
    let finalResponse = "";
    try {
      const refinePrompt = `Refine and finalize the following document draft:\n\nOriginal Request: ${query}\n\nResearch Findings:\n${researchFindings}\n\nDraft Document:\n${draftDocument}\n\nProvide the final, polished version of the document.`;
      const refineResponse = await refineAgent.generate(refinePrompt);
      finalResponse = refineResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield {
        type: "error" as const,
        error: `Refinement step failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
      return;
    }

    const duration = Date.now() - startTime;

    // Yield final result
    yield {
      type: "complete" as const,
      response: finalResponse,
      duration,
      agentsUsed: 3,
    };

    logger.log("[Legal Drafting Workflow] Streaming workflow completed", {
      duration: `${duration}ms`,
      responseLength: finalResponse.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[Legal Drafting Workflow] Streaming workflow failed", {
      error: errorMessage,
      duration: `${duration}ms`,
    });

    yield {
      type: "error" as const,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Type definitions for workflow results
 */
export type LegalDraftingResult = z.infer<typeof legalDraftingOutputSchema>;
export type LegalDraftingInput = z.infer<typeof legalDraftingInputSchema>;

/**
 * Type definitions for streaming results
 */
export type LegalDraftingStreamProgress = {
  type: "progress";
  step: number;
  totalSteps: number;
  agent: string;
  message: string;
};

export type LegalDraftingStreamComplete = {
  type: "complete";
  response: string;
  documentId?: string;
  duration: number;
  agentsUsed: number;
};

export type LegalDraftingStreamError = {
  type: "error";
  error: string;
  duration: number;
};

export type LegalDraftingStreamEvent =
  | LegalDraftingStreamProgress
  | LegalDraftingStreamComplete
  | LegalDraftingStreamError;
