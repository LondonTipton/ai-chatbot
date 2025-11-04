/**
 * Unit tests for Mastra response validation
 *
 * Tests the validation logic for Mastra agent and workflow responses
 * to ensure they meet minimum quality standards.
 */

import { expect, test } from "@playwright/test";
import type { MastraResult } from "@/lib/ai/mastra-router";
import {
  extractTextFromMessage,
  MIN_RESPONSE_LENGTH,
  validateMastraResponse,
  validateStreamResponse,
} from "@/lib/ai/mastra-validation";

test.describe("Mastra Validation", () => {
  test.describe("validateMastraResponse", () => {
    test("should validate successful response with sufficient length", () => {
      const result: MastraResult = {
        success: true,
        response: "This is a valid response with more than 10 characters.",
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(true);
      expect(validation.responseLength).toBeGreaterThan(MIN_RESPONSE_LENGTH);
    });

    test("should reject response that is too short", () => {
      const result: MastraResult = {
        success: true,
        response: "Short",
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain("too short");
      expect(validation.responseLength).toBeLessThan(MIN_RESPONSE_LENGTH);
    });

    test("should reject response with only whitespace", () => {
      const result: MastraResult = {
        success: true,
        response: "   \n\t   ",
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain("too short");
      expect(validation.responseLength).toBe(0);
    });

    test("should reject failed execution", () => {
      const result: MastraResult = {
        success: false,
        response: "",
        duration: 1000,
        agentsUsed: 0,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe("Execution failed");
    });

    test("should reject null response", () => {
      const result: MastraResult = {
        success: true,
        response: null as any,
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain("null or undefined");
    });

    test("should reject undefined response", () => {
      const result: MastraResult = {
        success: true,
        response: undefined as any,
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain("null or undefined");
    });

    test("should accept response exactly at minimum length", () => {
      const result: MastraResult = {
        success: true,
        response: "1234567890", // Exactly 10 characters
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(true);
      expect(validation.responseLength).toBe(MIN_RESPONSE_LENGTH);
    });

    test("should trim whitespace before measuring length", () => {
      const result: MastraResult = {
        success: true,
        response: "   Valid response with padding   ",
        duration: 1000,
        agentsUsed: 1,
      };

      const validation = validateMastraResponse(result);

      expect(validation.isValid).toBe(true);
      expect(validation.responseLength).toBeGreaterThan(MIN_RESPONSE_LENGTH);
    });
  });

  test.describe("validateStreamResponse", () => {
    test("should validate valid stream response", () => {
      const text = "This is a valid stream response with sufficient length.";

      const validation = validateStreamResponse(text);

      expect(validation.isValid).toBe(true);
      expect(validation.responseLength).toBeGreaterThan(MIN_RESPONSE_LENGTH);
    });

    test("should reject empty stream response", () => {
      const validation = validateStreamResponse("");

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain("empty");
      expect(validation.responseLength).toBe(0);
    });

    test("should reject short stream response", () => {
      const validation = validateStreamResponse("Short");

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain("too short");
      expect(validation.responseLength).toBeLessThan(MIN_RESPONSE_LENGTH);
    });

    test("should trim whitespace in stream response", () => {
      const text = "   Valid stream response   ";

      const validation = validateStreamResponse(text);

      expect(validation.isValid).toBe(true);
      expect(validation.responseLength).toBeGreaterThan(MIN_RESPONSE_LENGTH);
    });
  });

  test.describe("extractTextFromMessage", () => {
    test("should extract text from message with parts array", () => {
      const message = {
        parts: [
          { type: "text", text: "First part. " },
          { type: "text", text: "Second part." },
        ],
      };

      const text = extractTextFromMessage(message);

      expect(text).toBe("First part. Second part.");
    });

    test("should extract text from message with content property", () => {
      const message = {
        content: "This is the content.",
      };

      const text = extractTextFromMessage(message);

      expect(text).toBe("This is the content.");
    });

    test("should extract text from message with text property", () => {
      const message = {
        text: "This is the text.",
      };

      const text = extractTextFromMessage(message);

      expect(text).toBe("This is the text.");
    });

    test("should handle message with multiple text sources", () => {
      const message = {
        parts: [{ type: "text", text: "Part text. " }],
        content: "Content text. ",
        text: "Direct text.",
      };

      const text = extractTextFromMessage(message);

      expect(text).toBe("Part text. Content text. Direct text.");
    });

    test("should ignore non-text parts", () => {
      const message = {
        parts: [
          { type: "text", text: "Text part. " },
          { type: "image", url: "https://example.com/image.png" },
          { type: "text", text: "More text." },
        ],
      };

      const text = extractTextFromMessage(message);

      expect(text).toBe("Text part. More text.");
    });

    test("should return empty string for message with no text", () => {
      const message = {
        parts: [{ type: "image", url: "https://example.com/image.png" }],
      };

      const text = extractTextFromMessage(message);

      expect(text).toBe("");
    });

    test("should handle empty message", () => {
      const message = {};

      const text = extractTextFromMessage(message);

      expect(text).toBe("");
    });
  });
});
