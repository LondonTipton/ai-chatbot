import { createLogger } from "@/lib/logger";

const logger = createLogger("utils/validate-response");

/**
 * Check if a message has actual content
 * Works with any message type (ChatMessage or UIMessage)
 */
export function hasMessageContent(message: any): boolean {
  if (!message.parts || !Array.isArray(message.parts)) {
    return false;
  }

  return message.parts.some((part: any) => {
    // Check for text content
    if (part.type === "text" && part.text?.trim()) {
      return true;
    }

    // Check for tool outputs (has state property)
    if (
      part.type?.startsWith("tool-") &&
      "state" in part &&
      part.state === "output-available"
    ) {
      return true;
    }

    // Check for file attachments
    if (part.type === "file") {
      return true;
    }

    return false;
  });
}

/**
 * Check if a response contains any meaningful content
 * Works with any message array type
 */
export function validateResponse(messages: any[]): {
  isValid: boolean;
  assistantMessageCount: number;
  totalTextLength: number;
  hasToolOutputs: boolean;
  emptyMessages: number;
} {
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  let totalTextLength = 0;
  let hasToolOutputs = false;
  let emptyMessages = 0;

  for (const msg of assistantMessages) {
    const hasContent = hasMessageContent(msg);

    if (!hasContent) {
      emptyMessages++;
    }

    for (const part of msg.parts || []) {
      if (part.type === "text") {
        totalTextLength += part.text?.length || 0;
      }

      if (
        part.type?.startsWith("tool-") &&
        "state" in part &&
        part.state === "output-available"
      ) {
        hasToolOutputs = true;
      }
    }
  }

  return {
    isValid:
      assistantMessages.length > 0 && emptyMessages < assistantMessages.length,
    assistantMessageCount: assistantMessages.length,
    totalTextLength,
    hasToolOutputs,
    emptyMessages,
  };
}

/**
 * Get a summary of message content for logging
 */
export function getMessageSummary(messages: any[]): string {
  const validation = validateResponse(messages);

  const parts: string[] = [];

  if (validation.assistantMessageCount > 0) {
    parts.push(`${validation.assistantMessageCount} assistant message(s)`);
  }

  if (validation.totalTextLength > 0) {
    parts.push(`${validation.totalTextLength} chars`);
  }

  if (validation.hasToolOutputs) {
    parts.push("with tool outputs");
  }

  if (validation.emptyMessages > 0) {
    parts.push(`⚠️  ${validation.emptyMessages} empty`);
  }

  return parts.join(", ");
}

/**
 * Enhanced validation result with detailed reasoning
 */
export interface ValidationResult {
  isValid: boolean;
  reason: string;
  metrics: {
    assistantMessageCount: number;
    totalTextLength: number;
    hasToolOutputs: boolean;
    emptyMessages: number;
    toolCallsWithoutText: number;
  };
}

/**
 * Enhanced response validation with detailed reasoning and metrics
 * Implements comprehensive validation rules for AI responses
 */
export function validateResponseEnhanced(messages: any[]): ValidationResult {
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  // Metrics tracking
  let totalTextLength = 0;
  let hasToolOutputs = false;
  let emptyMessages = 0;
  let toolCallsWithoutText = 0;
  let hasToolCalls = false;

  // Analyze each assistant message
  for (const msg of assistantMessages) {
    let messageTextLength = 0;
    let messageHasToolCalls = false;
    let messageHasToolOutputs = false;

    for (const part of msg.parts || []) {
      // Count text content
      if (part.type === "text") {
        const text = part.text?.trim() || "";
        messageTextLength += text.length;
        totalTextLength += text.length;
      }

      // Detect tool calls (requests)
      if (part.type === "tool-call") {
        messageHasToolCalls = true;
        hasToolCalls = true;
      }

      // Detect tool outputs (results)
      if (
        part.type?.startsWith("tool-") &&
        "state" in part &&
        part.state === "output-available"
      ) {
        messageHasToolOutputs = true;
        hasToolOutputs = true;
      }
    }

    // Track messages with tool calls but no text
    if (messageHasToolCalls && messageTextLength === 0) {
      toolCallsWithoutText++;
    }

    // Track completely empty messages
    if (messageTextLength === 0 && !messageHasToolOutputs) {
      emptyMessages++;
    }
  }

  const metrics = {
    assistantMessageCount: assistantMessages.length,
    totalTextLength,
    hasToolOutputs,
    emptyMessages,
    toolCallsWithoutText,
  };

  // Validation Rule 1: No assistant messages at all
  if (assistantMessages.length === 0) {
    logger.log("[Validation] INVALID: No assistant messages found");
    return {
      isValid: false,
      reason: "No assistant messages in response",
      metrics,
    };
  }

  // Validation Rule 2: All messages are empty
  if (emptyMessages === assistantMessages.length) {
    logger.log(
      `[Validation] INVALID: All ${assistantMessages.length} assistant messages are empty`
    );
    return {
      isValid: false,
      reason: "All assistant messages are empty",
      metrics,
    };
  }

  // Validation Rule 3: Only tool calls without any text (Cerebras issue)
  // BUT: If we have tool calls, that's still valid - the AI is working
  if (toolCallsWithoutText > 0 && totalTextLength === 0 && !hasToolOutputs) {
    logger.log(
      `[Validation] INVALID: ${toolCallsWithoutText} tool call(s) without any explanatory text or outputs`
    );
    return {
      isValid: false,
      reason:
        "Response contains only tool calls without explanatory text or outputs",
      metrics,
    };
  }

  // Validation Rule 4: Text length below minimum threshold (10 characters)
  // BUT: If we have tool calls or outputs, that's acceptable
  const MIN_TEXT_LENGTH = 10;
  if (totalTextLength < MIN_TEXT_LENGTH && !hasToolCalls && !hasToolOutputs) {
    logger.log(
      `[Validation] INVALID: Text length ${totalTextLength} chars is below minimum ${MIN_TEXT_LENGTH} chars (no tools used)`
    );
    return {
      isValid: false,
      reason: `Text content too short (${totalTextLength} chars, minimum ${MIN_TEXT_LENGTH})`,
      metrics,
    };
  }

  // Validation Rule 4b: Tool outputs MUST have follow-up text
  // The AI should always explain tool results to the user
  if (hasToolOutputs && totalTextLength < MIN_TEXT_LENGTH) {
    logger.log(
      `[Validation] INVALID: Tool outputs present but insufficient follow-up text (${totalTextLength} chars)`
    );
    return {
      isValid: false,
      reason: `Tool outputs without sufficient explanatory text (${totalTextLength} chars, minimum ${MIN_TEXT_LENGTH})`,
      metrics,
    };
  }

  // Validation Rule 4c: Tool calls without outputs yet - might still be processing
  // This is acceptable as the tool is still executing
  if (hasToolCalls && !hasToolOutputs && totalTextLength < MIN_TEXT_LENGTH) {
    logger.log(
      `[Validation] VALID: Tool calls in progress (no outputs yet), accepting with ${totalTextLength} chars`
    );
    return {
      isValid: true,
      reason: "Tool calls in progress (waiting for outputs)",
      metrics,
    };
  }

  // Validation Rule 5: Valid - has tool outputs with sufficient follow-up text
  if (hasToolOutputs && totalTextLength >= MIN_TEXT_LENGTH) {
    logger.log(
      `[Validation] VALID: Tool outputs with ${totalTextLength} chars of follow-up text`
    );
    return {
      isValid: true,
      reason: "Response contains tool outputs with sufficient follow-up text",
      metrics,
    };
  }

  // Validation Rule 6: Valid - has sufficient text content
  if (totalTextLength >= MIN_TEXT_LENGTH) {
    logger.log(
      `[Validation] VALID: Response contains ${totalTextLength} chars of text`
    );
    return {
      isValid: true,
      reason: "Response contains sufficient text content",
      metrics,
    };
  }

  // Fallback: Should not reach here, but mark as invalid to be safe
  logger.log(
    `[Validation] INVALID (fallback): Unexpected validation state - ${JSON.stringify(
      metrics
    )}`
  );
  return {
    isValid: false,
    reason: "Response validation failed (unexpected state)",
    metrics,
  };
}
