/**
 * Unit tests for Tavily Advanced Search Tool
 *
 * Tests the optimized advanced search tool with:
 * - Default maxResults reduced to 7
 * - Token estimation
 * - Zimbabwe domain filtering
 * - Country and time range parameters
 */

import { expect, test } from "@playwright/test";
import { tavilySearchAdvancedTool } from "@/mastra/tools/tavily-search-advanced";

test.describe("Tavily Advanced Search Tool", () => {
  test.beforeEach(() => {
    // Set up environment variable
    process.env.TAVILY_API_KEY = "test-api-key";
  });

  test.describe("Default Configuration", () => {
    test("should use maxResults=7 by default", async () => {
      const mockResponse = {
        query: "test query",
        answer: "Test answer",
        results: Array.from({ length: 7 }, (_, i) => ({
          title: `Result ${i + 1}`,
          url: `https://example.com/${i + 1}`,
          content: `Content ${i + 1}`,
          score: 0.9 - i * 0.1,
          published_date: "2024-01-01",
        })),
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

      const result = await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify fetch was called with maxResults=7
      expect(capturedRequestBody.max_results).toBe(7);
      expect(capturedRequestBody.search_depth).toBe("advanced");

      // Verify results
      expect(result.results).toHaveLength(7);
      expect(result.totalResults).toBe(7);
      expect(result.searchDepth).toBe("advanced");

      global.fetch = originalFetch;
    });

    test("should respect custom maxResults parameter", async () => {
      const mockResponse = {
        query: "test query",
        answer: "Test answer",
        results: Array.from({ length: 5 }, (_, i) => ({
          title: `Result ${i + 1}`,
          url: `https://example.com/${i + 1}`,
          content: `Content ${i + 1}`,
          score: 0.9,
          published_date: "2024-01-01",
        })),
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          maxResults: 5,
        },
      });

      // Verify fetch was called with custom maxResults
      expect(capturedRequestBody.max_results).toBe(5);

      global.fetch = originalFetch;
    });

    test("should enforce maxResults limit of 10", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          maxResults: 15, // Should be capped at 10
        },
      });

      // Verify maxResults was capped at 10
      expect(capturedRequestBody.max_results).toBe(10);

      global.fetch = originalFetch;
    });
  });

  test.describe("Token Estimation", () => {
    test("should include tokenEstimate in response", async () => {
      const mockResponse = {
        query: "test query",
        answer: "This is a comprehensive test answer with detailed content",
        results: [
          {
            title: "Test Result 1",
            url: "https://example.com/1",
            content: "This is detailed test content for token estimation",
            score: 0.9,
            published_date: "2024-01-01",
          },
          {
            title: "Test Result 2",
            url: "https://example.com/2",
            content: "More detailed content for accurate token counting",
            score: 0.8,
            published_date: "2024-01-02",
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify tokenEstimate exists and is a positive number
      expect(result.tokenEstimate).toBeDefined();
      expect(typeof result.tokenEstimate).toBe("number");
      expect(result.tokenEstimate).toBeGreaterThan(0);

      // Should be reasonable for the content (answer + 2 results)
      expect(result.tokenEstimate).toBeGreaterThan(30);
      expect(result.tokenEstimate).toBeLessThan(200);

      global.fetch = originalFetch;
    });

    test("should estimate tokens accurately within ±10% tolerance", async () => {
      const mockResponse = {
        query: "test",
        answer: "Short answer text", // ~4 tokens
        results: [
          {
            title: "Title One", // ~3 tokens
            url: "https://example.com", // ~6 tokens
            content: "Content text here for testing", // ~6 tokens
            score: 0.9,
            published_date: "2024-01-01",
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilySearchAdvancedTool.execute({
        context: {
          query: "test",
        },
      });

      // Expected: ~4 (answer) + ~3 (title) + ~6 (url) + ~6 (content) + 5 (overhead) = ~24 tokens
      const expectedTokens = 24;
      const tolerance = expectedTokens * 0.1; // 10% tolerance

      expect(result.tokenEstimate).toBeGreaterThanOrEqual(
        expectedTokens - tolerance
      );
      expect(result.tokenEstimate).toBeLessThanOrEqual(
        expectedTokens + tolerance
      );

      global.fetch = originalFetch;
    });

    test("should handle empty results with minimal token estimate", async () => {
      const mockResponse = {
        query: "test",
        answer: "",
        results: [],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilySearchAdvancedTool.execute({
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
    test("should include Zimbabwe domains by default when jurisdiction is Zimbabwe", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          // jurisdiction defaults to "Zimbabwe"
        },
      });

      // Verify fetch was called with Zimbabwe domains
      expect(capturedRequestBody.include_domains).toBeDefined();
      expect(Array.isArray(capturedRequestBody.include_domains)).toBe(true);
      expect(capturedRequestBody.include_domains.length).toBeGreaterThan(0);

      // Verify it includes expected Zimbabwe domains
      expect(capturedRequestBody.include_domains).toContain("gov.zw");
      expect(capturedRequestBody.include_domains).toContain("zimlii.org");
      expect(capturedRequestBody.include_domains).toContain("veritaszim.net");

      global.fetch = originalFetch;
    });

    test("should not include domains when jurisdiction is not Zimbabwe", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          jurisdiction: "South Africa",
        },
      });

      // Verify fetch was called without include_domains
      expect(capturedRequestBody.include_domains).toBeUndefined();

      global.fetch = originalFetch;
    });

    test("should use custom includeDomains when provided", async () => {
      const mockResponse = {
        query: "test query",
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

      const customDomains = ["example.com", "test.org"];

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          includeDomains: customDomains,
        },
      });

      // Verify fetch was called with custom domains (not Zimbabwe defaults)
      expect(capturedRequestBody.include_domains).toEqual(customDomains);

      global.fetch = originalFetch;
    });
  });

  test.describe("Country Parameter", () => {
    test("should include country parameter when provided", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          country: "ZW",
        },
      });

      // Verify fetch was called with country parameter
      expect(capturedRequestBody.country).toBe("ZW");

      global.fetch = originalFetch;
    });

    test("should not include country parameter when not provided", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify fetch was called without country parameter
      expect(capturedRequestBody.country).toBeUndefined();

      global.fetch = originalFetch;
    });
  });

  test.describe("Time Range Parameter", () => {
    test("should include timeRange parameter when provided", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
          timeRange: "year",
        },
      });

      // Verify fetch was called with time_range parameter
      expect(capturedRequestBody.time_range).toBe("year");

      global.fetch = originalFetch;
    });

    test("should support all time range values", async () => {
      const mockResponse = {
        query: "test query",
        answer: "Test answer",
        results: [],
      };

      const originalFetch = global.fetch;
      const timeRanges = ["day", "week", "month", "year"] as const;

      for (const timeRange of timeRanges) {
        let capturedRequestBody: any;

        global.fetch = async (url: any, options: any) => {
          capturedRequestBody = JSON.parse(options.body);
          return {
            ok: true,
            json: async () => mockResponse,
          } as Response;
        };

        await tavilySearchAdvancedTool.execute({
          context: {
            query: "test query",
            timeRange,
          },
        });

        expect(capturedRequestBody.time_range).toBe(timeRange);
      }

      global.fetch = originalFetch;
    });

    test("should not include timeRange parameter when not provided", async () => {
      const mockResponse = {
        query: "test query",
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

      await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify fetch was called without time_range parameter
      expect(capturedRequestBody.time_range).toBeUndefined();

      global.fetch = originalFetch;
    });
  });

  test.describe("Error Handling", () => {
    test("should throw error when TAVILY_API_KEY is not configured", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      delete process.env.TAVILY_API_KEY;

      await expect(
        tavilySearchAdvancedTool.execute({
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
        } as Response);

      await expect(
        tavilySearchAdvancedTool.execute({
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
        tavilySearchAdvancedTool.execute({
          context: {
            query: "test query",
          },
        })
      ).rejects.toThrow("Network error");

      global.fetch = originalFetch;
    });
  });

  test.describe("Result Formatting", () => {
    test("should format results with position, relevanceScore, and publishedDate", async () => {
      const mockResponse = {
        query: "test query",
        answer: "Test answer",
        results: [
          {
            title: "Result 1",
            url: "https://example.com/1",
            content: "Content 1",
            score: 0.95,
            published_date: "2024-01-15",
          },
          {
            title: "Result 2",
            url: "https://example.com/2",
            content: "Content 2",
            score: 0.87,
            published_date: "2024-01-10",
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
        },
      });

      // Verify result formatting
      expect(result.results[0].position).toBe(1);
      expect(result.results[0].relevanceScore).toBe(0.95);
      expect(result.results[0].publishedDate).toBe("2024-01-15");

      expect(result.results[1].position).toBe(2);
      expect(result.results[1].relevanceScore).toBe(0.87);
      expect(result.results[1].publishedDate).toBe("2024-01-10");

      global.fetch = originalFetch;
    });

    test("should handle missing published_date gracefully", async () => {
      const mockResponse = {
        query: "test query",
        answer: "Test answer",
        results: [
          {
            title: "Result 1",
            url: "https://example.com/1",
            content: "Content 1",
            score: 0.9,
            // published_date missing
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilySearchAdvancedTool.execute({
        context: {
          query: "test query",
        },
      });

      expect(result.results[0].publishedDate).toBe("Not available");

      global.fetch = originalFetch;
    });
  });
});
