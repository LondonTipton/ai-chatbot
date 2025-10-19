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
