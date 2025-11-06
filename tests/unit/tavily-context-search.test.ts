import { expect, test } from "@playwright/test";
import { tavilyContextSearchTool } from "@/mastra/tools/tavily-context-search";

test.describe("Tavily Context Search Tool", () => {
  test.beforeEach(() => {
    // Set up environment variable
    process.env.TAVILY_API_KEY = "test-api-key";
  });

  test.describe("Token Limit Enforcement", () => {
    test("should enforce minimum token limit of 2000", async () => {
      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 1000, // Below minimum
        },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should enforce maximum token limit of 15000", async () => {
      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 20_000, // Above maximum
        },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should accept token limits within 2K-15K range", async () => {
      const mockResults = [
        {
          title: "Test Result",
          url: "https://example.com",
          raw_content: "Test content",
        },
      ];

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 5000,
        },
      });

      expect(result.context).toBeTruthy();
      expect(result.tokenCount).toBeGreaterThan(0);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should truncate content when exceeding maxTokens", async () => {
      // Create content that exceeds token limit
      const largeContent = "A".repeat(40_000); // ~10K tokens
      const mockResults = [
        {
          title: "Large Result",
          url: "https://example.com",
          raw_content: largeContent,
        },
      ];

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 3000, // Much smaller than content
        },
      });

      expect(result.truncated).toBe(true);
      expect(result.context).toContain("[...content truncated");
      expect(result.tokenCount).toBeLessThanOrEqual(3100); // Allow small margin

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should not truncate content within token limit", async () => {
      const smallContent = "A".repeat(1000); // ~250 tokens
      const mockResults = [
        {
          title: "Small Result",
          url: "https://example.com",
          raw_content: smallContent,
        },
      ];

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 5000,
        },
      });

      expect(result.truncated).toBe(false);
      expect(result.context).not.toContain("[...content truncated");

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Input Validation", () => {
    test("should reject queries shorter than 3 characters", async () => {
      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "ab",
          maxTokens: 5000,
        },
      });

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should reject queries longer than 500 characters", async () => {
      const longQuery = "a".repeat(501);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: longQuery,
          maxTokens: 5000,
        },
      });

      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should accept valid queries", async () => {
      const mockResults = [
        {
          title: "Test",
          url: "https://example.com",
          raw_content: "Content",
        },
      ];

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "What is contract law?",
          maxTokens: 5000,
        },
      });

      expect(result.context).toBeTruthy();

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Jurisdiction Parameter", () => {
    test("should enhance query with jurisdiction when provided", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "employment regulations",
          maxTokens: 5000,
          jurisdiction: "Zimbabwe",
        },
      });

      expect(capturedBody.query).toContain("Zimbabwe");
      expect(capturedBody.query).toContain("law");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should not modify query when jurisdiction is not provided", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "employment regulations",
          maxTokens: 5000,
        },
      });

      expect(capturedBody.query).toBe("employment regulations");

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Optional Parameters", () => {
    test("should include timeRange when provided", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "recent legal changes",
          maxTokens: 5000,
          timeRange: "month",
        },
      });

      expect(capturedBody.time_range).toBe("month");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should include includeDomains when provided", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "legal information",
          maxTokens: 5000,
          includeDomains: ["gov.zw", "zimlii.org"],
        },
      });

      expect(capturedBody.include_domains).toEqual(["gov.zw", "zimlii.org"]);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should not include optional parameters when not provided", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "legal information",
          maxTokens: 5000,
        },
      });

      expect(capturedBody.time_range).toBeUndefined();
      expect(capturedBody.include_domains).toBeUndefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Error Handling", () => {
    test("should throw error when TAVILY_API_KEY is not set", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      process.env.TAVILY_API_KEY = "";

      await expect(
        tavilyContextSearchTool.execute({
          context: {
            query: "Test query",
            maxTokens: 5000,
          },
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
            results: [
              {
                title: "Success",
                url: "https://example.com",
                raw_content: "Success after retry",
              },
            ],
          }),
        } as Response;
      };

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 5000,
        },
      });

      expect(result.context).toContain("Success after retry");
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
        tavilyContextSearchTool.execute({
          context: {
            query: "Test query",
            maxTokens: 5000,
          },
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
        } as Response);

      await expect(
        tavilyContextSearchTool.execute({
          context: {
            query: "Test query",
            maxTokens: 5000,
          },
        })
      ).rejects.toThrow("Tavily API error (429)");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should handle empty results gracefully", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "Test query",
          maxTokens: 5000,
        },
      });

      expect(result.context).toContain("No relevant context found");
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.truncated).toBe(false);

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
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "contract law",
          maxTokens: 8000,
        },
      });

      expect(capturedBody).toMatchObject({
        api_key: "test-api-key",
        query: "contract law",
        search_depth: "advanced",
        max_tokens: 8000,
        include_answer: false,
        include_raw_content: true,
      });

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should return properly formatted response", async () => {
      const mockResults = [
        {
          title: "Contract Law Basics",
          url: "https://example.com/contract-law",
          raw_content: "Contract law governs agreements between parties.",
        },
      ];

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "contract law",
          maxTokens: 5000,
        },
      });

      expect(result).toHaveProperty("context");
      expect(result).toHaveProperty("tokenCount");
      expect(result).toHaveProperty("truncated");
      expect(result).toHaveProperty("query");
      expect(typeof result.context).toBe("string");
      expect(typeof result.tokenCount).toBe("number");
      expect(typeof result.truncated).toBe("boolean");
      expect(typeof result.query).toBe("string");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should format context with titles, URLs, and content", async () => {
      const mockResults = [
        {
          title: "Result 1",
          url: "https://example.com/1",
          raw_content: "Content 1",
        },
        {
          title: "Result 2",
          url: "https://example.com/2",
          raw_content: "Content 2",
        },
      ];

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyContextSearchTool.execute({
        context: {
          query: "test",
          maxTokens: 5000,
        },
      });

      expect(result.context).toContain("## Result 1");
      expect(result.context).toContain("Source: https://example.com/1");
      expect(result.context).toContain("Content 1");
      expect(result.context).toContain("## Result 2");
      expect(result.context).toContain("Source: https://example.com/2");
      expect(result.context).toContain("Content 2");
      expect(result.context).toContain("---");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should use default maxTokens of 8000 when not specified", async () => {
      let capturedBody: any = null;

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async (
        _url: string | URL | Request,
        init?: RequestInit
      ) => {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return {
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response;
      };

      await tavilyContextSearchTool.execute({
        context: {
          query: "test query",
        },
      });

      expect(capturedBody.max_tokens).toBe(8000);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
