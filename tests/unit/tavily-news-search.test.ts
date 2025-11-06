import { expect, test } from "@playwright/test";
import { tavilyNewsSearchTool } from "@/mastra/tools/tavily-news-search";

test.describe("Tavily News Search Tool", () => {
  test.beforeEach(() => {
    // Set up environment variable
    process.env.TAVILY_API_KEY = "test-api-key";
  });

  test.describe("Date Filtering", () => {
    test("should filter news by days parameter (7 days default)", async () => {
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
            results: [
              {
                title: "Recent Legal Update",
                url: "https://example.com/news1",
                content: "Content about recent legal changes",
                published_date: new Date().toISOString().split("T")[0],
                score: 0.95,
              },
            ],
          }),
        } as Response;
      };

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Zimbabwe legal reforms" },
      });

      expect(capturedBody.days).toBe(7);
      expect(capturedBody.topic).toBe("news");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should accept custom days parameter (1-30 range)", async () => {
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

      await tavilyNewsSearchTool.execute({
        context: { query: "Test query", days: 14 },
      });

      expect(capturedBody.days).toBe(14);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should calculate correct date range", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response);

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query", days: 7 },
      });

      const fromDate = new Date(result.dateRange.from);
      const toDate = new Date(result.dateRange.to);
      const daysDiff = Math.round(
        (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBe(7);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should reject days less than 1", async () => {
      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query", days: 0 },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should reject days greater than 30", async () => {
      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query", days: 31 },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });
  });

  test.describe("Token Estimation", () => {
    test("should return token estimate within 2K-5K range for typical news results", async () => {
      const mockResults = Array.from({ length: 5 }, (_, i) => ({
        title: `News Article ${i + 1}: ${"A".repeat(100)}`,
        url: `https://example.com/news${i + 1}`,
        content: "A".repeat(1600), // ~400 tokens per article, 5 articles = ~2000 tokens
        published_date: new Date().toISOString().split("T")[0],
        score: 0.9,
      }));

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Zimbabwe news" },
      });

      expect(result.tokenEstimate).toBeGreaterThanOrEqual(1500);
      expect(result.tokenEstimate).toBeLessThanOrEqual(5500);

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should accurately estimate tokens (±10% tolerance)", async () => {
      const mockContent =
        "This is a test article with exactly 100 characters to verify token estimation accuracy works.";
      const mockResults = [
        {
          title: "Test Article",
          url: "https://example.com/test",
          content: mockContent,
          published_date: "2024-01-01",
          score: 0.9,
        },
      ];

      const expectedTokens = Math.ceil(JSON.stringify(mockResults).length / 4);

      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: mockResults,
          }),
        } as Response);

      const result = await tavilyNewsSearchTool.execute({
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
      const result = await tavilyNewsSearchTool.execute({
        context: { query: "ab" },
      });

      // Mastra returns validation errors as an object with error: true
      expect(result).toHaveProperty("error", true);
      expect(result).toHaveProperty("validationErrors");
    });

    test("should reject queries longer than 500 characters", async () => {
      const longQuery = "a".repeat(501);

      const result = await tavilyNewsSearchTool.execute({
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
            results: [
              {
                title: "Valid News",
                url: "https://example.com/news",
                content: "Valid content",
                published_date: "2024-01-01",
                score: 0.9,
              },
            ],
          }),
        } as Response);

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "What is the latest news?" },
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe("Valid News");

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Error Handling", () => {
    test("should throw error when TAVILY_API_KEY is not set", async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      process.env.TAVILY_API_KEY = "";

      await expect(
        tavilyNewsSearchTool.execute({
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
            results: [
              {
                title: "Success after retry",
                url: "https://example.com/news",
                content: "Content",
                published_date: "2024-01-01",
                score: 0.9,
              },
            ],
          }),
        } as Response;
      };

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query" },
      });

      expect(result.results[0].title).toBe("Success after retry");
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
        tavilyNewsSearchTool.execute({
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
        } as Response);

      await expect(
        tavilyNewsSearchTool.execute({
          context: { query: "Test query" },
        })
      ).rejects.toThrow("Tavily API error (429)");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should handle empty results", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: [],
          }),
        } as Response);

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query" },
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
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

      await tavilyNewsSearchTool.execute({
        context: { query: "Zimbabwe legal reforms", days: 14 },
      });

      expect(capturedBody).toMatchObject({
        api_key: "test-api-key",
        query: "Zimbabwe legal reforms",
        topic: "news",
        days: 14,
        max_results: 5,
        include_answer: false,
        include_raw_content: false,
        search_depth: "basic",
      });

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should enhance query with jurisdiction", async () => {
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

      await tavilyNewsSearchTool.execute({
        context: {
          query: "legal reforms",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(capturedBody.query).toBe("legal reforms Zimbabwe");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should return properly formatted response", async () => {
      const mockResults = [
        {
          title: "Legal Reform Announced",
          url: "https://example.com/news1",
          content: "Details about the legal reform",
          published_date: "2024-01-15",
          score: 0.95,
        },
        {
          title: "Court Ruling Update",
          url: "https://example.com/news2",
          content: "Information about court ruling",
          published_date: "2024-01-14",
          score: 0.88,
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

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Zimbabwe legal news" },
      });

      expect(result).toHaveProperty("results");
      expect(result).toHaveProperty("totalResults");
      expect(result).toHaveProperty("tokenEstimate");
      expect(result).toHaveProperty("query");
      expect(result).toHaveProperty("dateRange");

      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(2);
      expect(typeof result.tokenEstimate).toBe("number");
      expect(typeof result.query).toBe("string");

      // Verify result structure
      expect(result.results[0]).toHaveProperty("title");
      expect(result.results[0]).toHaveProperty("url");
      expect(result.results[0]).toHaveProperty("content");
      expect(result.results[0]).toHaveProperty("publishedDate");
      expect(result.results[0]).toHaveProperty("score");

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should handle missing fields in API response", async () => {
      const mockResults = [
        {
          // Missing title, published_date, score
          url: "https://example.com/news",
          content: "Some content",
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

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query" },
      });

      expect(result.results[0].title).toBe("Untitled");
      expect(result.results[0].score).toBe(0);
      expect(result.results[0].publishedDate).toBeTruthy();

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  test.describe("Response Structure", () => {
    test("should include all required fields in response", async () => {
      // Mock fetch for this test
      const originalFetch = global.fetch;
      global.fetch = async () =>
        ({
          ok: true,
          json: async () => ({
            results: [
              {
                title: "Test Article",
                url: "https://example.com/test",
                content: "Test content",
                published_date: "2024-01-01",
                score: 0.9,
              },
            ],
          }),
        } as Response);

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query", days: 7 },
      });

      // Verify all required fields are present
      expect(result.results).toBeDefined();
      expect(result.totalResults).toBeDefined();
      expect(result.tokenEstimate).toBeDefined();
      expect(result.query).toBeDefined();
      expect(result.dateRange).toBeDefined();
      expect(result.dateRange.from).toBeDefined();
      expect(result.dateRange.to).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test("should respect maxResults parameter", async () => {
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
            results: Array.from({ length: 3 }, (_, i) => ({
              title: `Article ${i + 1}`,
              url: `https://example.com/news${i + 1}`,
              content: "Content",
              published_date: "2024-01-01",
              score: 0.9,
            })),
          }),
        } as Response;
      };

      const result = await tavilyNewsSearchTool.execute({
        context: { query: "Test query", maxResults: 3 },
      });

      expect(capturedBody.max_results).toBe(3);
      expect(result.results).toHaveLength(3);

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
