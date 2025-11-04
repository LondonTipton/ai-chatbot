/**
 * Mastra Response Validation
 *
 * Validates Mastra agent and workflow responses to ensure they meet
 * minimum quality standards before committing usage transactions.
 *
 * Requirements:
 * - 12.1: Validate Mastra responses have minimum 10 characters
 * - 12.2: Log validation failures
 * - 12.3: Trigger fallback to AI SDK on validation failure
 * - 12.4: Commit transaction only on successful validation
 *
 * Usage:
 * ```typescript
 * const result = await routeToMastra("medium", query, context);
 * const validation = validateMastraResponse(result);
 *
 * if (!validation.isValid) {
 *   logger.error("Validation failed:", validation.reason);
 *   // Fallback to AI SDK
 * }
 * ```
 */

import { createLogger } from "@/lib/logger";
import type { MastraResult } from "./mastra-router";

const logger = createLogger("ai/mastra-validation");

/**
 * Minimum response length in characters
 * Responses shorter than this are considered invalid
 */
export const MIN_RESPONSE_LENGTH = 10;

/**
 * Validation result
 */
export type ValidationResult = {
  isValid: boolean;
  reason?: string;
  responseLength: number;
};

/**
 * Validate a Mastra response
 *
 * Checks that the response meets minimum quality standards:
 * - Response text is not empty
 * - Response has at least MIN_RESPONSE_LENGTH characters
 * - Response is not just whitespace
 *
 * @param result - The Mastra execution result
 * @returns Validation result with isValid flag and optional reason
 */
export function validateMastraResponse(result: MastraResult): ValidationResult {
  // Check if execution was successful
  if (!result.success) {
    logger.error("[Mastra Validation] ❌ Execution failed", {
      agentsUsed: result.agentsUsed,
      duration: result.duration,
    });

    return {
      isValid: false,
      reason: "Execution failed",
      responseLength: 0,
    };
  }

  // Check if response exists
  if (!result.response) {
    logger.error("[Mastra Validation] ❌ Response is null or undefined");

    return {
      isValid: false,
      reason: "Response is null or undefined",
      responseLength: 0,
    };
  }

  // Clean and measure response
  const cleanResponse = result.response.trim();
  const responseLength = cleanResponse.length;

  // Check minimum length
  if (responseLength < MIN_RESPONSE_LENGTH) {
    logger.error("[Mastra Validation] ❌ Response too short", {
      responseLength,
      minLength: MIN_RESPONSE_LENGTH,
      preview: cleanResponse.substring(0, 50),
    });

    return {
      isValid: false,
      reason: `Response too short (${responseLength} chars, minimum ${MIN_RESPONSE_LENGTH})`,
      responseLength,
    };
  }

  // Validation passed
  logger.log("[Mastra Validation] ✅ Response valid", {
    responseLength,
    minLength: MIN_RESPONSE_LENGTH,
  });

  return {
    isValid: true,
    responseLength,
  };
}

/**
 * Validate a streaming response text
 *
 * Used during streaming to validate the final response text.
 * This is a simpler version that just checks the text content.
 *
 * @param text - The response text to validate
 * @returns Validation result with isValid flag and optional reason
 */
export function validateStreamResponse(text: string): ValidationResult {
  // Check if text exists
  if (!text) {
    logger.error("[Mastra Validation] ❌ Stream response is empty");

    return {
      isValid: false,
      reason: "Stream response is empty",
      responseLength: 0,
    };
  }

  // Clean and measure response
  const cleanText = text.trim();
  const responseLength = cleanText.length;

  // Check minimum length
  if (responseLength < MIN_RESPONSE_LENGTH) {
    logger.error("[Mastra Validation] ❌ Stream response too short", {
      responseLength,
      minLength: MIN_RESPONSE_LENGTH,
      preview: cleanText.substring(0, 50),
    });

    return {
      isValid: false,
      reason: `Stream response too short (${responseLength} chars, minimum ${MIN_RESPONSE_LENGTH})`,
      responseLength,
    };
  }

  // Validation passed
  logger.log("[Mastra Validation] ✅ Stream response valid", {
    responseLength,
    minLength: MIN_RESPONSE_LENGTH,
  });

  return {
    isValid: true,
    responseLength,
  };
}

/**
 * Extract text content from a message object
 *
 * Helper function to extract text from various message formats
 * used in the streaming API.
 *
 * @param message - The message object
 * @returns Extracted text content
 */
export function extractTextFromMessage(message: any): string {
  let textContent = "";

  // Handle message with parts array
  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (part.type === "text" && part.text) {
        textContent += part.text;
      }
    }
  }

  // Handle message with direct content
  if (message.content && typeof message.content === "string") {
    textContent += message.content;
  }

  // Handle message with text property
  if (message.text && typeof message.text === "string") {
    textContent += message.text;
  }

  return textContent;
}
