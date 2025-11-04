import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { ensureAgentResponse, handleAgentError } from "../agent-helpers";
import { caseSearchAgent } from "../agents/case-search-agent";
import { compareAgent } from "../agents/compare-agent";
import { holdingsAgent } from "../agents/holdings-agent";

const logger = createLogger("workflows/case-law-analysis");

/**
 * Case Law Analysis Workflow
 *
 * This workflow orchestrates a three-step case law analysis process:
 * 1. Case Search Agent: Searches for relevant cases and precedents
 * 2. Holdings Agent: Extracts key holdings and legal principles from cases
 * 3. Compare Agent: Compares precedents and synthesizes comprehensive analysis
 *
 * Each agent is limited to 3 steps maximum to work within provider limitations.
 *
 * Note: Mastra 0.20.2 doesn't support the Workflow/Step pattern, so this
 * implementation uses sequential agent calls with manual data passing.
 *
 * Requirements:
 * - 5.1: Route case law queries to Case Law Analysis Workflow
 * - 5.2: First step searches for relevant cases (max 3 steps)
 * - 5.3: Second step extracts key holdings (max 3 steps)
 * - 5.4: Third step compares and analyzes precedents (max 3 steps)
 * - 5.5: Return comparative analysis with at least 150 characters
 *
 * Usage:
 * ```typescript
 * const result = await executeCaseLawAnalysis(
 *   "What are the leading cases on contract formation in Zimbabwe?",
 *   { userId: "123", chatId: "456" }
 * );
 * ```
 */

// Define the workflow input schema
const caseLawAnalysisInputSchema = z.object({
  query: z.string().describe("The user's case law query"),
  context: z
    .object({
      userId: z.string().optional(),
      chatId: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional()
    .describe("Additional context for the analysis"),
});

// Define the workflow output schema
const caseLawAnalysisOutputSchema = z.object({
  success: z.boolean().describe("Whether the workflow completed successfully"),
  response: z
    .string()
    .min(150)
    .describe("The comprehensive case law analysis (minimum 150 characters)"),
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
 * Execute the Case Law Analysis Workflow
 *
 * This function orchestrates the three-step workflow by calling agents sequentially
 * and passing data between them. Each agent is limited to 3 steps.
 *
 * @param query - The user's case law query
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Workflow result with success status, response, and step details
 */
export async function executeCaseLawAnalysis(
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

  logger.log("[Case Law Analysis Workflow] Starting workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Step 1: Case Search Agent
    logger.log("[Case Law Analysis Workflow] Step 1/3: Case Search Agent");
    const searchStartTime = Date.now();

    let caseSearchResults = "";
    try {
      const searchResponse = await caseSearchAgent.generate(query);
      caseSearchResults = searchResponse.text || "";
      const searchDuration = Date.now() - searchStartTime;

      steps.push({
        agent: caseSearchAgent.name,
        duration: searchDuration,
        output: caseSearchResults,
      });

      logger.log("[Case Law Analysis Workflow] Case Search Agent completed", {
        duration: `${searchDuration}ms`,
        outputLength: caseSearchResults.length,
      });
    } catch (error) {
      const searchDuration = Date.now() - searchStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: caseSearchAgent.name,
        duration: searchDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Case Law Analysis Workflow] Case Search Agent failed", {
        error: errorMessage,
        duration: `${searchDuration}ms`,
      });

      throw new Error(`Case search step failed: ${errorMessage}`);
    }

    // Step 2: Holdings Agent
    logger.log("[Case Law Analysis Workflow] Step 2/3: Holdings Agent");
    const holdingsStartTime = Date.now();

    let extractedHoldings = "";
    try {
      // Pass case search results to holdings agent
      const holdingsPrompt = `Extract key holdings and legal principles from the following cases:\n\n${caseSearchResults}`;
      const holdingsResponse = await holdingsAgent.generate(holdingsPrompt);
      extractedHoldings = holdingsResponse.text || "";
      const holdingsDuration = Date.now() - holdingsStartTime;

      steps.push({
        agent: holdingsAgent.name,
        duration: holdingsDuration,
        output: extractedHoldings,
      });

      logger.log("[Case Law Analysis Workflow] Holdings Agent completed", {
        duration: `${holdingsDuration}ms`,
        outputLength: extractedHoldings.length,
      });
    } catch (error) {
      const holdingsDuration = Date.now() - holdingsStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: holdingsAgent.name,
        duration: holdingsDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Case Law Analysis Workflow] Holdings Agent failed", {
        error: errorMessage,
        duration: `${holdingsDuration}ms`,
      });

      // Continue with partial results from case search
      logger.log(
        "[Case Law Analysis Workflow] Continuing with case search results only"
      );
      extractedHoldings = caseSearchResults;
    }

    // Step 3: Compare Agent
    logger.log("[Case Law Analysis Workflow] Step 3/3: Compare Agent");
    const compareStartTime = Date.now();

    let finalResponse = "";
    try {
      // Pass extracted holdings to compare agent
      const comparePrompt = `Compare and analyze the following case law to answer the query:\n\nOriginal Query: ${query}\n\nCase Holdings:\n${extractedHoldings}`;
      const compareResponse = await compareAgent.generate(comparePrompt);
      finalResponse = compareResponse.text || "";
      const compareDuration = Date.now() - compareStartTime;

      steps.push({
        agent: compareAgent.name,
        duration: compareDuration,
        output: finalResponse,
      });

      logger.log("[Case Law Analysis Workflow] Compare Agent completed", {
        duration: `${compareDuration}ms`,
        outputLength: finalResponse.length,
      });
    } catch (error) {
      const compareDuration = Date.now() - compareStartTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      steps.push({
        agent: compareAgent.name,
        duration: compareDuration,
        output: "",
        error: errorMessage,
      });

      logger.error("[Case Law Analysis Workflow] Compare Agent failed", {
        error: errorMessage,
        duration: `${compareDuration}ms`,
      });

      throw new Error(`Comparison step failed: ${errorMessage}`);
    }

    const duration = Date.now() - startTime;

    // Validate response length
    if (finalResponse.length < 150) {
      logger.warn(
        "[Case Law Analysis Workflow] Response too short",
        finalResponse.length
      );
      throw new Error(
        `Response validation failed: expected at least 150 characters, got ${finalResponse.length}`
      );
    }

    logger.log("[Case Law Analysis Workflow] Workflow completed successfully", {
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

    logger.error("[Case Law Analysis Workflow] Workflow failed", {
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
 * Stream the Case Law Analysis Workflow
 *
 * This function provides streaming support for the workflow, allowing
 * real-time updates as each agent completes its work.
 *
 * @param query - The user's case law query
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Async generator yielding workflow progress updates
 */
export async function* streamCaseLawAnalysis(
  query: string,
  context?: {
    userId?: string;
    chatId?: string;
    sessionId?: string;
  }
) {
  const startTime = Date.now();

  logger.log("[Case Law Analysis Workflow] Starting streaming workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Yield initial progress
    yield {
      type: "progress" as const,
      step: 1,
      totalSteps: 3,
      agent: caseSearchAgent.name,
      message: "Searching for relevant case law...",
    };

    // Step 1: Case Search Agent
    let caseSearchResults = "";
    try {
      const searchResponse = await caseSearchAgent.generate(query);
      caseSearchResults = searchResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield {
        type: "error" as const,
        error: `Case search step failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
      return;
    }

    // Yield progress after case search
    yield {
      type: "progress" as const,
      step: 2,
      totalSteps: 3,
      agent: holdingsAgent.name,
      message: "Extracting key holdings and legal principles...",
    };

    // Step 2: Holdings Agent
    let extractedHoldings = "";
    try {
      const holdingsPrompt = `Extract key holdings and legal principles from the following cases:\n\n${caseSearchResults}`;
      const holdingsResponse = await holdingsAgent.generate(holdingsPrompt);
      extractedHoldings = holdingsResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        "[Case Law Analysis Workflow] Holdings extraction failed, continuing with case search results",
        { error: errorMessage }
      );
      extractedHoldings = caseSearchResults;
    }

    // Yield progress after holdings extraction
    yield {
      type: "progress" as const,
      step: 3,
      totalSteps: 3,
      agent: compareAgent.name,
      message: "Comparing precedents and synthesizing analysis...",
    };

    // Step 3: Compare Agent
    let finalResponse = "";
    try {
      const comparePrompt = `Compare and analyze the following case law to answer the query:\n\nOriginal Query: ${query}\n\nCase Holdings:\n${extractedHoldings}`;
      const compareResponse = await compareAgent.generate(comparePrompt);
      finalResponse = compareResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield {
        type: "error" as const,
        error: `Comparison step failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
      return;
    }

    const duration = Date.now() - startTime;

    // Validate response length
    if (finalResponse.length < 150) {
      yield {
        type: "error" as const,
        error: `Response validation failed: expected at least 150 characters, got ${finalResponse.length}`,
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

    logger.log("[Case Law Analysis Workflow] Streaming workflow completed", {
      duration: `${duration}ms`,
      responseLength: finalResponse.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[Case Law Analysis Workflow] Streaming workflow failed", {
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
export type CaseLawAnalysisResult = z.infer<typeof caseLawAnalysisOutputSchema>;
export type CaseLawAnalysisInput = z.infer<typeof caseLawAnalysisInputSchema>;

/**
 * Type definitions for streaming results
 */
export type CaseLawAnalysisStreamProgress = {
  type: "progress";
  step: number;
  totalSteps: number;
  agent: string;
  message: string;
};

export type CaseLawAnalysisStreamComplete = {
  type: "complete";
  response: string;
  duration: number;
  agentsUsed: number;
};

export type CaseLawAnalysisStreamError = {
  type: "error";
  error: string;
  duration: number;
};

export type CaseLawAnalysisStreamEvent =
  | CaseLawAnalysisStreamProgress
  | CaseLawAnalysisStreamComplete
  | CaseLawAnalysisStreamError;
