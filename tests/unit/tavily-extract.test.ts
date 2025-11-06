/**
 * Unit tests for Tavily Extract Tool
 *
 * Tests the optimized extract tool with:
 * - Max 3 URLs enforcement
 * - Token estimation per URL
 * - Total token tracking
 */

import { expect, test } from "@playwright/test";
import { tavilyExtractTool } from "@/mastra/tools/tavily-extract";

test.describe("Tavily Extract Tool", () => {
  test.beforeEach(() => {
    process.env.TAVILY_API_KEY = "test-api-key";
  });

  test.describe("URL Limit Enforcement", () => {
    test("should accept up to 3 URLs", async () => {
      const mockResponse = {
        results: [
          { url: "https://example1.com", raw_content: "Content 1" },
          { url: "https://example2.com", raw_content: "Content 2" },
          { url: "https://example3.com", raw_content: "Content 3" },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: [
            "https://example1.com",
            "https://example2.com",
            "https://example3.com",
          ],
        },
      });

      expect(result.results).toHaveLength(3);
      expect(result.totalTokens).toBeGreaterThan(0);

      global.fetch = originalFetch;
    });

    test("should reject more than 3 URLs", async () => {
      const result = await tavilyExtractTool.execute({
        context: {
          urls: [
            "https://example1.com",
            "https://example2.com",
            "https://example3.com",
            "https://example4.com",
          ],
        },
      });

      // Zod validation catches this and returns an error object
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
      expect(result.validationErrors?.urls?._errors).toContain(
        "Maximum 3 URLs allowed per request"
      );
    });

    test("should accept 1 URL", async () => {
      const mockResponse = {
        results: [{ url: "https://example.com", raw_content: "Content" }],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example.com"],
        },
      });

      expect(result.results).toHaveLength(1);

      global.fetch = originalFetch;
    });

    test("should accept 2 URLs", async () => {
      const mockResponse = {
        results: [
          { url: "https://example1.com", raw_content: "Content 1" },
          { url: "https://example2.com", raw_content: "Content 2" },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example1.com", "https://example2.com"],
        },
      });

      expect(result.results).toHaveLength(2);

      global.fetch = originalFetch;
    });
  });

  test.describe("Token Estimation", () => {
    test("should provide token estimate per URL", async () => {
      const mockResponse = {
        results: [
          {
            url: "https://example1.com",
            raw_content: "This is some content that should be tokenized",
          },
          {
            url: "https://example2.com",
            raw_content: "Another piece of content for token estimation",
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example1.com", "https://example2.com"],
        },
      });

      expect(result.results[0].tokenEstimate).toBeGreaterThan(0);
      expect(result.results[1].tokenEstimate).toBeGreaterThan(0);
      expect(typeof result.results[0].tokenEstimate).toBe("number");
      expect(typeof result.results[1].tokenEstimate).toBe("number");

      global.fetch = originalFetch;
    });

    test("should provide total token count", async () => {
      const mockResponse = {
        results: [
          { url: "https://example1.com", raw_content: "Content 1" },
          { url: "https://example2.com", raw_content: "Content 2" },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example1.com", "https://example2.com"],
        },
      });

      expect(result.totalTokens).toBeGreaterThan(0);
      expect(typeof result.totalTokens).toBe("number");
      expect(result.totalTokens).toBe(
        result.results[0].tokenEstimate + result.results[1].tokenEstimate
      );

      global.fetch = originalFetch;
    });

    test("should calculate correct total tokens across all URLs", async () => {
      const content1 = "A".repeat(400); // ~100 tokens
      const content2 = "B".repeat(800); // ~200 tokens
      const content3 = "C".repeat(1200); // ~300 tokens

      const mockResponse = {
        results: [
          { url: "https://example1.com", raw_content: content1 },
          { url: "https://example2.com", raw_content: content2 },
          { url: "https://example3.com", raw_content: content3 },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: [
            "https://example1.com",
            "https://example2.com",
            "https://example3.com",
          ],
        },
      });

      // Verify individual estimates
      expect(result.results[0].tokenEstimate).toBe(100);
      expect(result.results[1].tokenEstimate).toBe(200);
      expect(result.results[2].tokenEstimate).toBe(300);

      // Verify total
      expect(result.totalTokens).toBe(600);

      global.fetch = originalFetch;
    });

    test("should handle empty content with zero tokens", async () => {
      const mockResponse = {
        results: [{ url: "https://example.com", raw_content: "" }],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example.com"],
        },
      });

      expect(result.results[0].tokenEstimate).toBe(0);
      expect(result.totalTokens).toBe(0);

      global.fetch = originalFetch;
    });
  });

  test.describe("API Integration", () => {
    test("should call Tavily API with correct parameters", async () => {
      const mockResponse = {
        results: [{ url: "https://example.com", raw_content: "Content" }],
      };

      const originalFetch = global.fetch;
      let capturedUrl: string | undefined;
      let capturedOptions: any;

      global.fetch = async (url: any, options: any) => {
        capturedUrl = url;
        capturedOptions = options;
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      };

      await tavilyExtractTool.execute({
        context: {
          urls: ["https://example.com"],
        },
      });

      expect(capturedUrl).toBe("https://api.tavily.com/extract");
      expect(capturedOptions.method).toBe("POST");
      expect(capturedOptions.headers["Content-Type"]).toBe("application/json");
      expect(capturedOptions.body).toContain("https://example.com");

      global.fetch = originalFetch;
    });

    test("should handle API errors gracefully", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: false,
          statusText: "Bad Request",
        } as Response);

      await expect(
        tavilyExtractTool.execute({
          context: {
            urls: ["https://example.com"],
          },
        })
      ).rejects.toThrow("Tavily API error: Bad Request");

      global.fetch = originalFetch;
    });

    test("should handle missing API key", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      delete process.env.TAVILY_API_KEY;

      await expect(
        tavilyExtractTool.execute({
          context: {
            urls: ["https://example.com"],
          },
        })
      ).rejects.toThrow("TAVILY_API_KEY is not configured");

      process.env.TAVILY_API_KEY = originalKey;
    });
  });

  test.describe("Response Format", () => {
    test("should return results with url, rawContent, and tokenEstimate", async () => {
      const mockResponse = {
        results: [{ url: "https://example.com", raw_content: "Test content" }],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example.com"],
        },
      });

      expect(result.results[0]).toHaveProperty("url");
      expect(result.results[0]).toHaveProperty("rawContent");
      expect(result.results[0]).toHaveProperty("tokenEstimate");
      expect(result).toHaveProperty("totalTokens");

      global.fetch = originalFetch;
    });

    test("should handle missing raw_content in API response", async () => {
      const mockResponse = {
        results: [{ url: "https://example.com" }],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example.com"],
        },
      });

      expect(result.results[0].rawContent).toBe("");
      expect(result.results[0].tokenEstimate).toBe(0);

      global.fetch = originalFetch;
    });

    test("should handle empty results array", async () => {
      const mockResponse = {
        results: [],
      };

      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const result = await tavilyExtractTool.execute({
        context: {
          urls: ["https://example.com"],
        },
      });

      expect(result.results).toEqual([]);
      expect(result.totalTokens).toBe(0);

      global.fetch = originalFetch;
    });
  });
});
