import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/agent-helpers");

/**
 * Agent Helper Functions
 *
 * Shared utilities for Mastra agents to ensure consistent behavior
 * and handle edge cases like empty responses.
 */

import {
  ensureMessageHasText,
  extractTextFromParts,
} from "./response-synthesis";

/**
 * Process agent response and ensure it has text content
 *
 * This function should be called after every agent execution to:
 * 1. Check if the response has text
 * 2. Synthesize from tool results if needed
 * 3. Provide a fallback message if synthesis fails
 *
 * @param response - The agent's response object
 * @param agentName - Name of the agent for logging
 * @returns Processed response with guaranteed text content
 */
export function ensureAgentResponse(response: any, agentName: string): string {
  // If response is already a string, return it
  if (typeof response === "string") {
    return response.trim() || getFallbackMessage(agentName);
  }

  // If response has a text property
  if (response?.text) {
    return response.text.trim() || getFallbackMessage(agentName);
  }

  // If response has a message property
  if (response?.message) {
    return response.message.trim() || getFallbackMessage(agentName);
  }

  // If response has a content property
  if (response?.content) {
    return response.content.trim() || getFallbackMessage(agentName);
  }

  // If response has parts (AI SDK format)
  if (response?.parts && Array.isArray(response.parts)) {
    const textContent = extractTextFromParts(response.parts);
    if (textContent) {
      return textContent;
    }

    // Try to synthesize from tool results
    const synthesized = ensureMessageHasText({
      role: "assistant",
      parts: response.parts,
    });

    if (synthesized) {
      return extractTextFromParts(response.parts);
    }
  }

  // If response is an object with tool results
  if (response && typeof response === "object") {
    // Try to extract any meaningful content
    const keys = Object.keys(response);
    for (const key of keys) {
      if (
        typeof response[key] === "string" &&
        response[key].trim().length > 0
      ) {
        return response[key].trim();
      }
    }
  }

  // Last resort: return fallback message
  logger.warn(
    `[Agent Helper] ${agentName} returned empty or invalid response, using fallback`
  );
  return getFallbackMessage(agentName);
}

/**
 * Get a fallback message for an agent
 */
function getFallbackMessage(agentName: string): string {
  const fallbacks: Record<string, string> = {
    "search-agent":
      "I searched for relevant information but couldn't generate a summary. Please try rephrasing your query.",
    "analyze-agent":
      "I analyzed the information but encountered an issue generating the analysis. Please try again.",
    "extract-agent":
      "I attempted to extract key information but couldn't generate a summary. Please try again.",
    "structure-agent":
      "I organized the information but encountered an issue with the output. Please try again.",
    "recommendations-agent":
      "I processed the information but couldn't generate recommendations. Please try again.",
    "case-search-agent":
      "I searched for relevant cases but couldn't generate a summary. Please try rephrasing your query.",
    "holdings-agent":
      "I analyzed the case holdings but encountered an issue generating the summary. Please try again.",
    "compare-agent":
      "I compared the cases but couldn't generate the comparison. Please try again.",
    "research-agent":
      "I conducted research but encountered an issue generating the summary. Please try again.",
    "draft-agent":
      "I attempted to draft the document but encountered an issue. Please try again with more specific requirements.",
    "refine-agent":
      "I attempted to refine the document but encountered an issue. Please try again.",
    "issues-agent":
      "I analyzed for issues but couldn't generate the report. Please try again.",
    "medium-research":
      "I conducted research but encountered an issue generating the summary. Please try again.",
  };

  return (
    fallbacks[agentName] ||
    `The ${agentName} encountered an issue generating a response. Please try again.`
  );
}

/**
 * Validate agent input before execution
 *
 * Ensures the agent receives valid input to work with
 */
export function validateAgentInput(
  input: any,
  agentName: string,
  requiredFields: string[] = []
): boolean {
  if (!input) {
    logger.error(`[Agent Helper] ${agentName} received null/undefined input`);
    return false;
  }

  for (const field of requiredFields) {
    if (!input[field]) {
      logger.error(
        `[Agent Helper] ${agentName} missing required field: ${field}`
      );
      return false;
    }
  }

  return true;
}

/**
 * Log agent execution for debugging
 */
export function logAgentExecution(
  agentName: string,
  input: any,
  output: any,
  duration?: number
) {
  logger.log(`[Agent] ${agentName} executed`, {
    inputLength: JSON.stringify(input).length,
    outputLength:
      typeof output === "string"
        ? output.length
        : JSON.stringify(output).length,
    duration: duration ? `${duration}ms` : "N/A",
  });
}

/**
 * Handle agent errors consistently
 */
export function handleAgentError(
  error: any,
  agentName: string,
  context?: any
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error(`[Agent Error] ${agentName} failed:`, {
    error: errorMessage,
    context,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return `I encountered an error while processing your request with the ${agentName}. Please try again or rephrase your query.`;
}
