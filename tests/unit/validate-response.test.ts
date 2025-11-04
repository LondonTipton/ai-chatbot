import { expect, test } from "@playwright/test";
import {
  type ValidationResult,
  validateResponseEnhanced,
} from "@/lib/utils/validate-response";

test.describe("Enhanced Response Validator", () => {
  test.describe("Valid responses with text only", () => {
    test("should validate response with sufficient text content", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "This is a valid response with enough text content.",
            },
          ],
        },
      ];

      const result: ValidationResult = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.reason).toContain("sufficient text content");
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
      expect(result.metrics.assistantMessageCount).toBe(1);
      expect(result.metrics.emptyMessages).toBe(0);
      expect(result.metrics.toolCallsWithoutText).toBe(0);
    });

    test("should validate response with exactly 10 characters", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "1234567890", // Exactly 10 characters
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.totalTextLength).toBe(10);
    });

    test("should validate response with multiple text parts", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "First part. ",
            },
            {
              type: "text",
              text: "Second part.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should validate response with multiple assistant messages", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "First message.",
            },
          ],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Second message.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.assistantMessageCount).toBe(2);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe("Valid responses with tools and text", () => {
    test("should validate response with tool outputs and follow-up text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "createDocument",
              args: { title: "Test" },
            },
          ],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "tool-result",
              toolCallId: "call-1",
              toolName: "createDocument",
              result: { success: true },
              state: "output-available",
            },
            {
              type: "text",
              text: "I've created the document for you.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.reason).toContain(
        "tool outputs with sufficient follow-up text"
      );
      expect(result.metrics.hasToolOutputs).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should validate response with tool call followed by text in same message", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "createDocument",
              args: { title: "Test" },
            },
            {
              type: "text",
              text: "Let me create that document for you.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
      expect(result.metrics.toolCallsWithoutText).toBe(0);
    });

    test("should validate response with multiple tool outputs and text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-result",
              toolCallId: "call-1",
              toolName: "createDocument",
              result: { success: true },
              state: "output-available",
            },
            {
              type: "tool-result",
              toolCallId: "call-2",
              toolName: "updateDocument",
              result: { success: true },
              state: "output-available",
            },
            {
              type: "text",
              text: "I've completed both operations successfully.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.hasToolOutputs).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });
  });

  test.describe("Invalid responses with tools only", () => {
    test("should invalidate response with only tool calls and no text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "createDocument",
              args: { title: "Test" },
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      // Tool calls without text are detected as empty messages first
      expect(result.reason).toContain("All assistant messages are empty");
      expect(result.metrics.toolCallsWithoutText).toBe(1);
      expect(result.metrics.totalTextLength).toBe(0);
      expect(result.metrics.emptyMessages).toBe(1);
    });

    test("should invalidate response with multiple tool calls and no text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "createDocument",
              args: { title: "Test" },
            },
            {
              type: "tool-call",
              toolCallId: "call-2",
              toolName: "updateDocument",
              args: { id: "123" },
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      // Tool calls without text are detected as empty messages first
      expect(result.reason).toContain("All assistant messages are empty");
      expect(result.metrics.toolCallsWithoutText).toBe(1);
      expect(result.metrics.emptyMessages).toBe(1);
    });

    test("should invalidate response with tool outputs but insufficient text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-result",
              toolCallId: "call-1",
              toolName: "createDocument",
              result: { success: true },
              state: "output-available",
            },
            {
              type: "text",
              text: "Done.", // Only 5 characters
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("too short");
      expect(result.metrics.hasToolOutputs).toBe(true);
      expect(result.metrics.totalTextLength).toBeLessThan(10);
    });
  });

  test.describe("Invalid responses with empty content", () => {
    test("should invalidate response with no assistant messages", () => {
      const messages = [
        {
          role: "user",
          parts: [
            {
              type: "text",
              text: "Hello",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("No assistant messages");
      expect(result.metrics.assistantMessageCount).toBe(0);
    });

    test("should invalidate response with empty assistant message", () => {
      const messages = [
        {
          role: "assistant",
          parts: [],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("All assistant messages are empty");
      expect(result.metrics.emptyMessages).toBe(1);
    });

    test("should invalidate response with all empty assistant messages", () => {
      const messages = [
        {
          role: "assistant",
          parts: [],
        },
        {
          role: "assistant",
          parts: [],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("All assistant messages are empty");
      expect(result.metrics.assistantMessageCount).toBe(2);
      expect(result.metrics.emptyMessages).toBe(2);
    });

    test("should invalidate response with text below minimum length", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Hi", // Only 2 characters
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("too short");
      expect(result.metrics.totalTextLength).toBe(2);
    });
  });

  test.describe("Edge cases (whitespace, special characters)", () => {
    test("should trim whitespace when counting text length", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "   Valid text   ", // Whitespace should be trimmed
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should invalidate response with only whitespace", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "     ", // Only whitespace
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.metrics.totalTextLength).toBe(0);
    });

    test("should validate response with special characters", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Hello! 👋 How can I help you today?",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should validate response with newlines and formatting", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Line 1\nLine 2\nLine 3",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should handle messages with undefined or null text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: undefined,
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.metrics.totalTextLength).toBe(0);
    });

    test("should handle messages with missing parts array", () => {
      const messages = [
        {
          role: "assistant",
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.metrics.emptyMessages).toBe(1);
    });

    test("should handle mixed valid and empty messages", () => {
      const messages = [
        {
          role: "assistant",
          parts: [],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "This is a valid message with enough content.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.assistantMessageCount).toBe(2);
      expect(result.metrics.emptyMessages).toBe(1);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should handle empty string text", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(false);
      expect(result.metrics.totalTextLength).toBe(0);
    });
  });

  test.describe("Complex scenarios", () => {
    test("should handle response with tool calls in one message and text in another", () => {
      const messages = [
        {
          role: "assistant",
          parts: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "createDocument",
              args: { title: "Test" },
            },
          ],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "I've created the document as requested.",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.toolCallsWithoutText).toBe(1);
      expect(result.metrics.totalTextLength).toBeGreaterThanOrEqual(10);
    });

    test("should track metrics correctly for complex response", () => {
      const messages = [
        {
          role: "user",
          parts: [{ type: "text", text: "Create a document" }],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "createDocument",
              args: { title: "Test" },
            },
          ],
        },
        {
          role: "assistant",
          parts: [
            {
              type: "tool-result",
              toolCallId: "call-1",
              toolName: "createDocument",
              result: { success: true },
              state: "output-available",
            },
            {
              type: "text",
              text: "Document created successfully!",
            },
          ],
        },
      ];

      const result = validateResponseEnhanced(messages);

      expect(result.isValid).toBe(true);
      expect(result.metrics.assistantMessageCount).toBe(2);
      expect(result.metrics.hasToolOutputs).toBe(true);
      expect(result.metrics.toolCallsWithoutText).toBe(1);
      // First message has tool call but no text, so it's counted as empty
      expect(result.metrics.emptyMessages).toBe(1);
    });
  });
});
