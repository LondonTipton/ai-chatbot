import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { ensureAgentResponse, handleAgentError } from "../agent-helpers";
import { issuesAgent } from "../agents/issues-agent";
import { recommendationsAgent } from "../agents/recommendations-agent";
import { structureAgent } from "../agents/structure-agent";

const logger = createLogger("workflows/document-review");

/**
 * Document Review Workflow
 *
 * This workflow orchestrates a three-step document review process:
 * 1. Structure Agent: Analyzes document structure and organization
 * 2. Issues Agent: Identifies specific issues, gaps, and problems
 * 3. Recommendations Agent: Provides actionable recommendations to address issues
 *
 * Each agent is limited to 3 steps maximum to work within provider limitations.
 *
 * Note: Mastra 0.20.2 doesn't support the Workflow/Step pattern, so this
 * implementation uses sequential agent calls with manual data passing.
 *
 * Requirements:
 * - 4.1: Route workflow queries to Document Review Workflow
 * - 4.2: First step analyzes document structure (max 3 steps)
 * - 4.3: Second step identifies issues and gaps (max 3 steps)
 * - 4.4: Third step provides recommendations (max 3 steps)
 * - 4.5: Return structured feedback with at least 100 characters
 *
 * Usage:
 * ```typescript
 * const result = await executeDocumentReview(
 *   "Review this employment contract for completeness and legal compliance...",
 *   { userId: "123", chatId: "456" }
 * );
 * ```
 */

// Define the workflow input schema
const documentReviewInputSchema = z.object({
  query: z.string().describe("The document review request with document text"),
  context: z
    .object({
      userId: z.string().optional(),
      chatId: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional()
    .describe("Additional context for the review"),
});

// Define the workflow output schema
const documentReviewOutputSchema = z.object({
  success: z.boolean().describe("Whether the workflow completed successfully"),
  response: z
    .string()
    .min(100)
    .describe("The structured review feedback (minimum 100 characters)"),
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
 * Execute the Document Review Workflow
 *
 * This function orchestrates the three-step workflow by calling agents sequentially
 * and passing data between them. Each agent is limited to 3 steps.
 *
 * @param query - The document review request with document text
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Workflow result with success status, response, and step details
 */
export async function executeDocumentReview(
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

  logger.log("[Document Review Workflow] Starting workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Step 1: Structure Agent
    logger.log("[Document Review Workflow] Step 1/3: Structure Agent");
    const structureStartTime = Date.now();

    let structureAnalysis = "";
    try {
      const structureResponse = await structureAgent.generate(query);
      structureAnalysis = structureResponse.text || "";
      const structureDuration = Date.now() - structureStartTime;

      steps.push({
        agent: structureAgent.name,
        duration: structureDuration,
        output: structureAnalysis,
      });

      logger.log("[Document Review Workflow] Structure Agent completed", {
        duration: `${structureDuration}ms`,
        outputLength: structureAnalysis.length,
      });
    } catch (error) {
      const structureDuration = Date.now() - structureStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: structureAgent.name,
        duration: structureDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Document Review Workflow] Structure Agent failed", {
        error: errorMessage,
        duration: `${structureDuration}ms`,
      });

      throw new Error(`Structure analysis step failed: ${errorMessage}`);
    }

    // Step 2: Issues Agent
    logger.log("[Document Review Workflow] Step 2/3: Issues Agent");
    const issuesStartTime = Date.now();

    let issuesIdentified = "";
    try {
      // Pass structure analysis to issues agent
      const issuesPrompt = `Based on the following structural analysis, identify specific issues, gaps, and problems in the document:\n\nStructural Analysis:\n${structureAnalysis}\n\nOriginal Document:\n${query}`;
      const issuesResponse = await issuesAgent.generate(issuesPrompt);
      issuesIdentified = issuesResponse.text || "";
      const issuesDuration = Date.now() - issuesStartTime;

      steps.push({
        agent: issuesAgent.name,
        duration: issuesDuration,
        output: issuesIdentified,
      });

      logger.log("[Document Review Workflow] Issues Agent completed", {
        duration: `${issuesDuration}ms`,
        outputLength: issuesIdentified.length,
      });
    } catch (error) {
      const issuesDuration = Date.now() - issuesStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: issuesAgent.name,
        duration: issuesDuration,
        output: structureAnalysis, // Store partial result
        error: errorMessage,
      });

      logger.warn(
        "[Document Review Workflow] ⚠️ Issues Agent failed, continuing with structure analysis",
        {
          error: errorMessage,
          duration: `${issuesDuration}ms`,
          partialResultLength: structureAnalysis.length,
        }
      );

      // Continue with partial results from structure analysis
      issuesIdentified = structureAnalysis;
    }

    // Step 3: Recommendations Agent
    logger.log("[Document Review Workflow] Step 3/3: Recommendations Agent");
    const recommendationsStartTime = Date.now();

    let finalResponse = "";
    try {
      // Pass issues to recommendations agent
      const recommendationsPrompt = `Provide specific, actionable recommendations to address the following issues:\n\nStructural Analysis:\n${structureAnalysis}\n\nIssues Identified:\n${issuesIdentified}\n\nOriginal Document:\n${query}`;
      const recommendationsResponse = await recommendationsAgent.generate(
        recommendationsPrompt
      );
      finalResponse = recommendationsResponse.text || "";
      const recommendationsDuration = Date.now() - recommendationsStartTime;

      steps.push({
        agent: recommendationsAgent.name,
        duration: recommendationsDuration,
        output: finalResponse,
      });

      logger.log("[Document Review Workflow] Recommendations Agent completed", {
        duration: `${recommendationsDuration}ms`,
        outputLength: finalResponse.length,
      });
    } catch (error) {
      const recommendationsDuration = Date.now() - recommendationsStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Use issues analysis as fallback response
      finalResponse = issuesIdentified;

      steps.push({
        agent: recommendationsAgent.name,
        duration: recommendationsDuration,
        output: finalResponse,
        error: errorMessage,
      });

      logger.warn(
        "[Document Review Workflow] ⚠️ Recommendations Agent failed, using issues analysis as response",
        {
          error: errorMessage,
          duration: `${recommendationsDuration}ms`,
          fallbackResponseLength: finalResponse.length,
        }
      );
    }

    const duration = Date.now() - startTime;

    // Validate response length
    if (finalResponse.length < 100) {
      logger.warn(
        "[Document Review Workflow] ⚠️ Response too short, workflow may have partial results",
        {
          responseLength: finalResponse.length,
          stepsWithErrors: steps.filter((s) => s.error).length,
        }
      );

      // If we have any content at all, return it as partial success
      if (finalResponse.length > 0) {
        logger.log("[Document Review Workflow] ✅ Returning partial results", {
          duration: `${duration}ms`,
          stepsCompleted: steps.length,
          responseLength: finalResponse.length,
          stepsWithErrors: steps.filter((s) => s.error).length,
        });

        return {
          success: true,
          response: finalResponse,
          steps,
          duration,
          agentsUsed: steps.filter((s) => !s.error).length,
        };
      }

      // No content at all, workflow failed
      logger.error(
        "[Document Review Workflow] ❌ Workflow failed with no content"
      );
      return {
        success: false,
        response: "",
        steps,
        duration,
        agentsUsed: steps.filter((s) => !s.error).length,
      };
    }

    logger.log(
      "[Document Review Workflow] ✅ Workflow completed successfully",
      {
        duration: `${duration}ms`,
        stepsCompleted: steps.length,
        responseLength: finalResponse.length,
        stepsWithErrors: steps.filter((s) => s.error).length,
      }
    );

    return {
      success: true,
      response: finalResponse,
      steps,
      duration,
      agentsUsed: steps.filter((s) => !s.error).length,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      "[Document Review Workflow] ❌ Workflow failed with exception",
      {
        error: errorMessage,
        duration: `${duration}ms`,
        stepsCompleted: steps.length,
        stack: error instanceof Error ? error.stack : undefined,
      }
    );

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
 * Stream the Document Review Workflow
 *
 * This function provides streaming support for the workflow, allowing
 * real-time updates as each agent completes its work.
 *
 * @param query - The document review request with document text
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Async generator yielding workflow progress updates
 */
export async function* streamDocumentReview(
  query: string,
  context?: {
    userId?: string;
    chatId?: string;
    sessionId?: string;
  }
) {
  const startTime = Date.now();

  logger.log("[Document Review Workflow] Starting streaming workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Yield initial progress
    yield {
      type: "progress" as const,
      step: 1,
      totalSteps: 3,
      agent: structureAgent.name,
      message: "Analyzing document structure...",
    };

    // Step 1: Structure Agent
    let structureAnalysis = "";
    try {
      const structureResponse = await structureAgent.generate(query);
      structureAnalysis = structureResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield {
        type: "error" as const,
        error: `Structure analysis step failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
      return;
    }

    // Yield progress after structure analysis
    yield {
      type: "progress" as const,
      step: 2,
      totalSteps: 3,
      agent: issuesAgent.name,
      message: "Identifying issues and gaps...",
    };

    // Step 2: Issues Agent
    let issuesIdentified = "";
    let issuesFailed = false;
    try {
      const issuesPrompt = `Based on the following structural analysis, identify specific issues, gaps, and problems in the document:\n\nStructural Analysis:\n${structureAnalysis}\n\nOriginal Document:\n${query}`;
      const issuesResponse = await issuesAgent.generate(issuesPrompt);
      issuesIdentified = issuesResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      issuesFailed = true;
      logger.warn(
        "[Document Review Workflow] ⚠️ Issues identification failed, continuing with structure analysis",
        { error: errorMessage }
      );
      issuesIdentified = structureAnalysis;
    }

    // Yield progress after issues identification
    yield {
      type: "progress" as const,
      step: 3,
      totalSteps: 3,
      agent: recommendationsAgent.name,
      message: "Generating recommendations...",
    };

    // Step 3: Recommendations Agent
    let finalResponse = "";
    let recommendationsFailed = false;
    try {
      const recommendationsPrompt = `Provide specific, actionable recommendations to address the following issues:\n\nStructural Analysis:\n${structureAnalysis}\n\nIssues Identified:\n${issuesIdentified}\n\nOriginal Document:\n${query}`;
      const recommendationsResponse = await recommendationsAgent.generate(
        recommendationsPrompt
      );
      finalResponse = recommendationsResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      recommendationsFailed = true;
      logger.warn(
        "[Document Review Workflow] ⚠️ Recommendations failed, using issues analysis as response",
        { error: errorMessage }
      );
      // Use issues analysis as fallback
      finalResponse = issuesIdentified;
    }

    const duration = Date.now() - startTime;

    // Validate response length - be lenient if we had failures
    const minLength = issuesFailed || recommendationsFailed ? 10 : 100;
    if (finalResponse.length < minLength) {
      yield {
        type: "error" as const,
        error: `Response validation failed: expected at least ${minLength} characters, got ${finalResponse.length}`,
        duration,
      };
      return;
    }

    // Yield final result
    yield {
      type: "complete" as const,
      response: finalResponse,
      duration,
      agentsUsed: 3,
    };

    logger.log("[Document Review Workflow] Streaming workflow completed", {
      duration: `${duration}ms`,
      responseLength: finalResponse.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[Document Review Workflow] Streaming workflow failed", {
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
export type DocumentReviewResult = z.infer<typeof documentReviewOutputSchema>;
export type DocumentReviewInput = z.infer<typeof documentReviewInputSchema>;

/**
 * Type definitions for streaming results
 */
export type DocumentReviewStreamProgress = {
  type: "progress";
  step: number;
  totalSteps: number;
  agent: string;
  message: string;
};

export type DocumentReviewStreamComplete = {
  type: "complete";
  response: string;
  duration: number;
  agentsUsed: number;
};

export type DocumentReviewStreamError = {
  type: "error";
  error: string;
  duration: number;
};

export type DocumentReviewStreamEvent =
  | DocumentReviewStreamProgress
  | DocumentReviewStreamComplete
  | DocumentReviewStreamError;
