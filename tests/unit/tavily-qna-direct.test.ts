import { expect, test } from "@playwright/test";
import { tavilyQnaDirectTool } from "@/mastra/tools/tavily-qna-direct";

test.describe("Tavily QnA Direct Tool", () => {
  test.beforeEach(() => {
    // Set up environment variable
    process.env.TAVILY_API_KEY = "test-api-key";
  });

  test.describe("Token Estimation", () => {
    test("should return token estimate within 200-500 range for typical answers", async () => {
      const mockAnswer = "A".repeat(800); // ~200 tokens (800 chars / 4)

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            answer: mockAnswer,
          }),
        }) as Response;

      const result = await tavilyQnaDirectTool.execute({
        context: { query: "What is contract law?" },
      });

      expect(result.tokenEstimate).toBeGreaterThanOrEqual(150);
      expect(result.tokenEstimate).toBeLessThanOrEqual(550);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should accurately estimate tokens (±10% tolerance)", async () => {
      const mockAnswer =
        "This is a test answer with exactly 100 characters to verify token estimation accuracy works.";
      const expectedTokens = Math.ceil(mockAnswer.length / 4); // ~25 tokens

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            answer: mockAnswer,
          }),
        }) as Response;

      const result = await tavilyQnaDirectTool.execute({
        context: { query: "Test query" },
      });

      // Allow ±10% tolerance
      const lowerBound = expectedTokens * 0.9;
      const upperBound = expectedTokens * 1.1;

      expect(result.tokenEstimate).toBeGreaterThanOrEqual(lowerBound);
      expect(result.tokenEstimate).toBeLessThanOrEqual(upperBound);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Input Validation", () => {
    test("should reject queries shorter than 3 characters", async () => {
      const result = await tavilyQnaDirectTool.execute({
        context: { query: "ab" },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should reject queries longer than 500 characters", async () => {
      const longQuery = "a".repeat(501);

      const result = await tavilyQnaDirectTool.execute({
        context: { query: longQuery },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should accept valid queries", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            answer: "Valid answer",
          }),
        }) as Response;

      const result = await tavilyQnaDirectTool.execute({
        context: { query: "What is the law?" },
      });

      expect(result.answer).toBe("Valid answer");

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Error Handling", () => {
    test("should throw error when TAVILY_API_KEY is not set", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      delete process.env.TAVILY_API_KEY;

      await expect(
        tavilyQnaDirectTool.execute({
          context: { query: "Test query" },
        })
      ).rejects.toThrow("TAVILY_API_KEY is not configured");

      // Restore original key
      process.env.TAVILY_API_KEY = originalKey;
    });

    test("should retry once on API failure", async () => {
      let callCount = 0;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Network error");
        }
        return {
          ok: true,
          json: async () => ({
            answer: "Success after retry",
          }),
        } as Response;
      };

      const result = await tavilyQnaDirectTool.execute({
        context: { query: "Test query" },
      });

      expect(result.answer).toBe("Success after retry");
      expect(callCount).toBe(2);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should fail after max retries", async () => {
      let callCount = 0;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () => {
        callCount++;
        throw new Error("Network error");
      };

      await expect(
        tavilyQnaDirectTool.execute({
          context: { query: "Test query" },
        })
      ).rejects.toThrow("failed after 2 attempts");

      expect(callCount).toBe(2);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should handle API error responses", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: async () => "Rate limit exceeded",
        }) as Response;

      await expect(
        tavilyQnaDirectTool.execute({
          context: { query: "Test query" },
        })
      ).rejects.toThrow("Tavily API error (429)");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should handle missing answer in response", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({}), // No answer field
        }) as Response;

      const result = await tavilyQnaDirectTool.execute({
        context: { query: "Test query" },
      });

      expect(result.answer).toBe("No answer available for this query.");
      expect(result.tokenEstimate).toBeGreaterThan(0);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("API Integration", () => {
    test("should call Tavily API with correct parameters", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            answer: "Test answer",
          }),
        } as Response;
      };

      await tavilyQnaDirectTool.execute({
        context: { query: "What is contract law?" },
      });

      expect(capturedBody).toMatchObject({
        api_key: "test-api-key",
        query: "What is contract law?",
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 1,
      });

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should return properly formatted response", async () => {
      const mockAnswer = "Contract law governs agreements between parties.";

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            answer: mockAnswer,
          }),
        }) as Response;

      const result = await tavilyQnaDirectTool.execute({
        context: { query: "What is contract law?" },
      });

      expect(result).toHaveProperty("answer");
      expect(result).toHaveProperty("tokenEstimate");
      expect(typeof result.answer).toBe("string");
      expect(typeof result.tokenEstimate).toBe("number");
      expect(result.answer).toBe(mockAnswer);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
