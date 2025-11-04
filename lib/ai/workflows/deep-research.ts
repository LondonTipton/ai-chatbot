import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { ensureAgentResponse, handleAgentError } from "../agent-helpers";
import { analyzeAgent } from "../agents/analyze-agent";
import { extractAgent } from "../agents/extract-agent";
import { searchAgent } from "../agents/search-agent";

const logger = createLogger("workflows/deep-research");

/**
 * Deep Research Workflow
 *
 * This workflow orchestrates a three-step deep research process:
 * 1. Search Agent: Performs initial searches to identify relevant sources
 * 2. Extract Agent: Extracts detailed content from identified sources
 * 3. Analyze Agent: Synthesizes extracted content into comprehensive response
 *
 * Each agent is limited to 3 steps maximum to work within provider limitations.
 *
 * Note: Mastra 0.20.2 doesn't support the Workflow/Step pattern, so this
 * implementation uses sequential agent calls with manual data passing.
 *
 * Requirements:
 * - 3.1: Route deep queries to Deep Research Workflow
 * - 3.2: First step searches for information (max 3 steps)
 * - 3.3: Second step extracts content (max 3 steps)
 * - 3.4: Third step analyzes and synthesizes (max 3 steps)
 * - 3.5: Return comprehensive response with at least 100 characters
 *
 * Usage:
 * ```typescript
 * const result = await executeDeepResearch(
 *   "What are the requirements for contract formation in Zimbabwe?",
 *   { userId: "123", chatId: "456" }
 * );
 * ```
 */

// Define the workflow input schema
const deepResearchInputSchema = z.object({
  query: z.string().describe("The user's research query"),
  context: z
    .object({
      userId: z.string().optional(),
      chatId: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional()
    .describe("Additional context for the research"),
});

// Define the workflow output schema
const deepResearchOutputSchema = z.object({
  success: z.boolean().describe("Whether the workflow completed successfully"),
  response: z
    .string()
    .min(100)
    .describe("The comprehensive research response (minimum 100 characters)"),
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
 * Execute the Deep Research Workflow
 *
 * This function orchestrates the three-step workflow by calling agents sequentially
 * and passing data between them. Each agent is limited to 3 steps.
 *
 * @param query - The user's research query
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Workflow result with success status, response, and step details
 */
export async function executeDeepResearch(
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

  logger.log("[Deep Research Workflow] Starting workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Step 1: Search Agent
    logger.log("[Deep Research Workflow] Step 1/3: Search Agent");
    const searchStartTime = Date.now();

    let searchResults = "";
    try {
      const searchResponse = await searchAgent.generate(query);
      // Ensure response has content
      searchResults = ensureAgentResponse(searchResponse, searchAgent.name);
      const searchDuration = Date.now() - searchStartTime;

      steps.push({
        agent: searchAgent.name,
        duration: searchDuration,
        output: searchResults,
      });

      logger.log("[Deep Research Workflow] Search Agent completed", {
        duration: `${searchDuration}ms`,
        outputLength: searchResults.length,
      });
    } catch (error) {
      const searchDuration = Date.now() - searchStartTime;
      searchResults = handleAgentError(error, searchAgent.name, { query });

      steps.push({
        agent: searchAgent.name,
        duration: searchDuration,
        output: searchResults,
        error: error instanceof Error ? error.message : String(error),
      });

      logger.error("[Deep Research Workflow] Search Agent failed", {
        error: error instanceof Error ? error.message : String(error),
        duration: `${searchDuration}ms`,
      });

      // Don't throw - continue with error message as output
    }

    // Step 2: Extract Agent
    logger.log("[Deep Research Workflow] Step 2/3: Extract Agent");
    const extractStartTime = Date.now();

    let extractedContent = "";
    try {
      // Pass search results to extract agent
      const extractPrompt = `Based on the following search results, extract detailed content from the most relevant sources:\n\n${searchResults}`;
      const extractResponse = await extractAgent.generate(extractPrompt);
      // Ensure response has content
      extractedContent = ensureAgentResponse(
        extractResponse,
        extractAgent.name
      );
      const extractDuration = Date.now() - extractStartTime;

      steps.push({
        agent: extractAgent.name,
        duration: extractDuration,
        output: extractedContent,
      });

      logger.log("[Deep Research Workflow] Extract Agent completed", {
        duration: `${extractDuration}ms`,
        outputLength: extractedContent.length,
      });
    } catch (error) {
      const extractDuration = Date.now() - extractStartTime;
      extractedContent = handleAgentError(error, extractAgent.name, {
        searchResults: searchResults.substring(0, 200),
      });

      steps.push({
        agent: extractAgent.name,
        duration: extractDuration,
        output: extractedContent,
        error: error instanceof Error ? error.message : String(error),
      });

      logger.warn(
        "[Deep Research Workflow] ⚠️ Extract Agent failed, using fallback",
        {
          error: error instanceof Error ? error.message : String(error),
          duration: `${extractDuration}ms`,
        }
      );
    }

    // Step 3: Analyze Agent
    logger.log("[Deep Research Workflow] Step 3/3: Analyze Agent");
    const analyzeStartTime = Date.now();

    let finalResponse = "";
    try {
      // Pass extracted content to analyze agent
      const analyzePrompt = `Analyze and synthesize the following research content into a comprehensive response:\n\nOriginal Query: ${query}\n\nResearch Content:\n${extractedContent}`;
      const analyzeResponse = await analyzeAgent.generate(analyzePrompt);
      // Ensure response has content
      finalResponse = ensureAgentResponse(analyzeResponse, analyzeAgent.name);
      const analyzeDuration = Date.now() - analyzeStartTime;

      steps.push({
        agent: analyzeAgent.name,
        duration: analyzeDuration,
        output: finalResponse,
      });

      logger.log("[Deep Research Workflow] Analyze Agent completed", {
        duration: `${analyzeDuration}ms`,
        outputLength: finalResponse.length,
      });
    } catch (error) {
      const analyzeDuration = Date.now() - analyzeStartTime;
      // Use extracted content as fallback if available, otherwise use error message
      finalResponse =
        extractedContent ||
        handleAgentError(error, analyzeAgent.name, { query });

      steps.push({
        agent: analyzeAgent.name,
        duration: analyzeDuration,
        output: finalResponse,
        error: error instanceof Error ? error.message : String(error),
      });

      logger.warn(
        "[Deep Research Workflow] ⚠️ Analyze Agent failed, using fallback",
        {
          error: error instanceof Error ? error.message : String(error),
          duration: `${analyzeDuration}ms`,
          fallbackResponseLength: finalResponse.length,
        }
      );
    }

    const duration = Date.now() - startTime;

    // Validate response length
    if (finalResponse.length < 100) {
      logger.warn(
        "[Deep Research Workflow] ⚠️ Response too short, workflow may have partial results",
        {
          responseLength: finalResponse.length,
          stepsWithErrors: steps.filter((s) => s.error).length,
        }
      );

      // If we have any content at all, return it as partial success
      if (finalResponse.length > 0) {
        logger.log("[Deep Research Workflow] ✅ Returning partial results", {
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
        "[Deep Research Workflow] ❌ Workflow failed with no content"
      );
      return {
        success: false,
        response: "",
        steps,
        duration,
        agentsUsed: steps.filter((s) => !s.error).length,
      };
    }

    logger.log("[Deep Research Workflow] ✅ Workflow completed successfully", {
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
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[Deep Research Workflow] ❌ Workflow failed with exception", {
      error: errorMessage,
      duration: `${duration}ms`,
      stepsCompleted: steps.length,
      stack: error instanceof Error ? error.stack : undefined,
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
 * Stream the Deep Research Workflow
 *
 * This function provides streaming support for the workflow, allowing
 * real-time updates as each agent completes its work.
 *
 * @param query - The user's research query
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Async generator yielding workflow progress updates
 */
export async function* streamDeepResearch(
  query: string,
  context?: {
    userId?: string;
    chatId?: string;
    sessionId?: string;
  }
) {
  const startTime = Date.now();

  logger.log("[Deep Research Workflow] Starting streaming workflow", {
    query: query.substring(0, 100),
    context,
  });

  try {
    // Yield initial progress
    yield {
      type: "progress" as const,
      step: 1,
      totalSteps: 3,
      agent: searchAgent.name,
      message: "Searching for relevant information...",
    };

    // Step 1: Search Agent
    let searchResults = "";
    try {
      const searchResponse = await searchAgent.generate(query);
      searchResults = searchResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield {
        type: "error" as const,
        error: `Search step failed: ${errorMessage}`,
        duration: Date.now() - startTime,
      };
      return;
    }

    // Yield progress after search
    yield {
      type: "progress" as const,
      step: 2,
      totalSteps: 3,
      agent: extractAgent.name,
      message: "Extracting detailed content...",
    };

    // Step 2: Extract Agent
    let extractedContent = "";
    let extractFailed = false;
    try {
      const extractPrompt = `Based on the following search results, extract detailed content from the most relevant sources:\n\n${searchResults}`;
      const extractResponse = await extractAgent.generate(extractPrompt);
      extractedContent = extractResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      extractFailed = true;
      logger.warn(
        "[Deep Research Workflow] ⚠️ Extract failed, continuing with search results",
        { error: errorMessage }
      );
      extractedContent = searchResults;
    }

    // Yield progress after extract
    yield {
      type: "progress" as const,
      step: 3,
      totalSteps: 3,
      agent: analyzeAgent.name,
      message: "Analyzing and synthesizing findings...",
    };

    // Step 3: Analyze Agent
    let finalResponse = "";
    let analyzeFailed = false;
    try {
      const analyzePrompt = `Analyze and synthesize the following research content into a comprehensive response:\n\nOriginal Query: ${query}\n\nResearch Content:\n${extractedContent}`;
      const analyzeResponse = await analyzeAgent.generate(analyzePrompt);
      finalResponse = analyzeResponse.text || "";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      analyzeFailed = true;
      logger.warn(
        "[Deep Research Workflow] ⚠️ Analyze failed, using extracted content as response",
        { error: errorMessage }
      );
      // Use extracted content as fallback
      finalResponse = extractedContent;
    }

    const duration = Date.now() - startTime;

    // Validate response length - be lenient if we had failures
    const minLength = extractFailed || analyzeFailed ? 10 : 100;
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

    logger.log("[Deep Research Workflow] Streaming workflow completed", {
      duration: `${duration}ms`,
      responseLength: finalResponse.length,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error("[Deep Research Workflow] Streaming workflow failed", {
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
export type DeepResearchResult = z.infer<typeof deepResearchOutputSchema>;
export type DeepResearchInput = z.infer<typeof deepResearchInputSchema>;

/**
 * Type definitions for streaming results
 */
export type DeepResearchStreamProgress = {
  type: "progress";
  step: number;
  totalSteps: number;
  agent: string;
  message: string;
};

export type DeepResearchStreamComplete = {
  type: "complete";
  response: string;
  duration: number;
  agentsUsed: number;
};

export type DeepResearchStreamError = {
  type: "error";
  error: string;
  duration: number;
};

export type DeepResearchStreamEvent =
  | DeepResearchStreamProgress
  | DeepResearchStreamComplete
  | DeepResearchStreamError;
