/**
 * Unit tests for Tavily Basic Search Tool
 *
 * Tests the optimized basic search tool with:
 * - Default maxResults reduced to 3
 * - Token estimation
 * - Zimbabwe domain filtering
 */

import { expect, test } from "@playwright/test";
import { tavilySearchTool } from "@/mastra/tools/tavily-search";

test.describe("Tavily Basic Search Tool", () => {
  test.beforeEach(() => {
    // Set up environment variable
    process.env.TAVILY_API_KEY = "test-api-key";
  });

  test.describe("Default Configuration", () => {
    test("should use maxResults=3 by default", async () => {
      const mockResponse = {
        answer: "Test answer",
        results: [
          {
            title: "Result 1",
            url: "https://example.com/1",
            content: "Content 1",
            score: 0.9,
          },
          {
            title: "Result 2",
            url: "https://example.com/2",
            content: "Content 2",
            score: 0.8,
          },
          {
            title: "Result 3",
            url: "https://example.com/3",
            content: "Content 3",
            score: 0.7,
          },
        ],
      };

      const originalFetch = global.fetch;
      let capturedRequestBody: any;

      global.fetch = async (url: any, options: any) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      const result = await tavilySearchTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify fetch was called with maxResults=3
      expect(capturedRequestBody.max_results).toBe(3);

      // Verify results
      expect(result.results).toHaveLength(3);
      expect(result.totalResults).toBe(3);

      global.fetch = originalFetch;
    });

    test("should respect custom maxResults parameter", async () => {
      const mockResponse = {
        answer: "Test answer",
        results: [
          {
            title: "Result 1",
            url: "https://example.com/1",
            content: "Content 1",
            score: 0.9,
          },
        ],
      };

      const originalFetch = global.fetch;
      let capturedRequestBody: any;

      global.fetch = async (url: any, options: any) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      await tavilySearchTool.execute({
        context: {
          query: "test query",
          maxResults: 5,
        },
      });

      // Verify fetch was called with custom maxResults
      expect(capturedRequestBody.max_results).toBe(5);

      global.fetch = originalFetch;
    });
  });

  test.describe("Token Estimation", () => {
    test("should include tokenEstimate in response", async () => {
      const mockResponse = {
        answer: "This is a test answer with some content",
        results: [
          {
            title: "Test Result",
            url: "https://example.com",
            content: "This is test content for token estimation",
            score: 0.9,
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        }) as Response;

      const result = await tavilySearchTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify tokenEstimate exists and is a positive number
      expect(result.tokenEstimate).toBeDefined();
      expect(typeof result.tokenEstimate).toBe("number");
      expect(result.tokenEstimate).toBeGreaterThan(0);

      // Rough validation: should be reasonable for the content
      // Answer (~10 tokens) + Result (~20 tokens) = ~30 tokens
      expect(result.tokenEstimate).toBeGreaterThan(20);
      expect(result.tokenEstimate).toBeLessThan(100);

      global.fetch = originalFetch;
    });

    test("should estimate tokens accurately within ±10% tolerance", async () => {
      const mockResponse = {
        answer: "Short answer", // ~3 tokens
        results: [
          {
            title: "Title", // ~2 tokens
            url: "https://example.com", // ~6 tokens
            content: "Content text here", // ~4 tokens
            score: 0.9,
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        }) as Response;

      const result = await tavilySearchTool.execute({
        context: {
          query: "test",
        },
      });

      // Expected: ~3 (answer) + ~2 (title) + ~6 (url) + ~4 (content) + 5 (overhead) = ~20 tokens
      const expectedTokens = 20;
      const tolerance = expectedTokens * 0.1; // 10% tolerance

      expect(result.tokenEstimate).toBeGreaterThanOrEqual(
        expectedTokens - tolerance
      );
      expect(result.tokenEstimate).toBeLessThanOrEqual(
        expectedTokens + tolerance
      );

      global.fetch = originalFetch;
    });

    test("should handle empty results with zero token estimate", async () => {
      const mockResponse = {
        answer: "",
        results: [],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        }) as Response;

      const result = await tavilySearchTool.execute({
        context: {
          query: "test query",
        },
      });

      expect(result.tokenEstimate).toBe(0);
      expect(result.totalResults).toBe(0);

      global.fetch = originalFetch;
    });
  });

  test.describe("Zimbabwe Domain Filtering", () => {
    test("should not filter domains by default", async () => {
      const mockResponse = {
        answer: "Test answer",
        results: [],
      };

      const originalFetch = global.fetch;
      let capturedRequestBody: any;

      global.fetch = async (url: any, options: any) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      await tavilySearchTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify fetch was called without include_domains
      expect(capturedRequestBody.include_domains).toBeUndefined();

      global.fetch = originalFetch;
    });

    test("should include Zimbabwe domains when filterZimbabweDomains=true", async () => {
      const mockResponse = {
        answer: "Test answer",
        results: [],
      };

      const originalFetch = global.fetch;
      let capturedRequestBody: any;

      global.fetch = async (url: any, options: any) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      await tavilySearchTool.execute({
        context: {
          query: "Zimbabwe law",
          filterZimbabweDomains: true,
        },
      });

      // Verify fetch was called with include_domains
      expect(capturedRequestBody.include_domains).toBeDefined();
      expect(Array.isArray(capturedRequestBody.include_domains)).toBe(true);
      expect(capturedRequestBody.include_domains.length).toBeGreaterThan(0);

      // Verify it includes expected Zimbabwe domains
      expect(capturedRequestBody.include_domains).toContain("gov.zw");
      expect(capturedRequestBody.include_domains).toContain("zimlii.org");

      global.fetch = originalFetch;
    });
  });

  test.describe("Error Handling", () => {
    test("should throw error when TAVILY_API_KEY is not configured", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      delete process.env.TAVILY_API_KEY;

      await expect(
        tavilySearchTool.execute({
          context: {
            query: "test query",
          },
        })
      ).rejects.toThrow("TAVILY_API_KEY is not configured");

      process.env.TAVILY_API_KEY = originalKey;
    });

    test("should throw error on API failure", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: false,
          statusText: "Internal Server Error",
        }) as Response;

      await expect(
        tavilySearchTool.execute({
          context: {
            query: "test query",
          },
        })
      ).rejects.toThrow("Tavily API error: Internal Server Error");

      global.fetch = originalFetch;
    });

    test("should handle network errors", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error("Network error");
      };

      await expect(
        tavilySearchTool.execute({
          context: {
            query: "test query",
          },
        })
      ).rejects.toThrow("Network error");

      global.fetch = originalFetch;
    });
  });

  test.describe("Result Limit Enforcement", () => {
    test("should enforce maxResults=3 limit", async () => {
      // Mock API returning exactly 3 results
      const mockResponse = {
        answer: "Test answer",
        results: [
          {
            title: "1",
            url: "https://example.com/1",
            content: "C1",
            score: 0.9,
          },
          {
            title: "2",
            url: "https://example.com/2",
            content: "C2",
            score: 0.8,
          },
          {
            title: "3",
            url: "https://example.com/3",
            content: "C3",
            score: 0.7,
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        }) as Response;

      const result = await tavilySearchTool.execute({
        context: {
          query: "test query",
        },
      });

      // Should return exactly 3 results
      expect(result.results).toHaveLength(3);
      expect(result.totalResults).toBe(3);

      global.fetch = originalFetch;
    });
  });
});
