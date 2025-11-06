import { expect, test } from "@playwright/test";
import {
  estimateSearchResultTokens,
  estimateTokens,
  TokenTracker,
} from "@/lib/utils/token-estimation";

test.describe("Token Estimation Utilities", () => {
  test.describe("estimateTokens", () => {
    test("should estimate tokens for simple text", () => {
      const text = "Hello world";
      const tokens = estimateTokens(text);

      // "Hello world" = 11 characters / 4 = ~3 tokens
      expect(tokens).toBeGreaterThanOrEqual(2);
      expect(tokens).toBeLessThanOrEqual(4);
    });

    test("should estimate tokens for longer text", () => {
      const text =
        "This is a longer piece of text that should result in more tokens being estimated.";
      const tokens = estimateTokens(text);

      // 82 characters / 4 = ~21 tokens
      expect(tokens).toBeGreaterThanOrEqual(18);
      expect(tokens).toBeLessThanOrEqual(24);
    });

    test("should estimate tokens for object input", () => {
      const obj = {
        title: "Test Title",
        content: "Test content here",
      };
      const tokens = estimateTokens(obj);

      // JSON stringified length / 4
      const jsonLength = JSON.stringify(obj).length;
      const expectedTokens = Math.ceil(jsonLength / 4);

      expect(tokens).toBe(expectedTokens);
    });

    test("should handle empty string", () => {
      const tokens = estimateTokens("");
      expect(tokens).toBe(0);
    });

    test("should handle empty object", () => {
      const tokens = estimateTokens({});
      // "{}" = 2 characters / 4 = 1 token
      expect(tokens).toBe(1);
    });

    test("should be within ±10% tolerance for typical text", () => {
      // Typical legal text sample
      const text =
        "The Constitution of Zimbabwe is the supreme law of Zimbabwe. It was adopted in 2013.";
      const tokens = estimateTokens(text);

      // 84 characters / 4 = 21 tokens
      const expected = 21;
      const tolerance = expected * 0.1; // 10% tolerance

      expect(tokens).toBeGreaterThanOrEqual(expected - tolerance);
      expect(tokens).toBeLessThanOrEqual(expected + tolerance);
    });

    test("should handle special characters", () => {
      const text = "Hello! 👋 How are you?";
      const tokens = estimateTokens(text);

      // Should still provide reasonable estimate
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    test("should handle newlines and whitespace", () => {
      const text = "Line 1\nLine 2\n\nLine 3";
      const tokens = estimateTokens(text);

      // 22 characters / 4 = ~6 tokens
      expect(tokens).toBeGreaterThanOrEqual(5);
      expect(tokens).toBeLessThanOrEqual(7);
    });
  });

  test.describe("estimateSearchResultTokens", () => {
    test("should estimate tokens for single search result", () => {
      const results = [
        {
          title: "Test Result",
          content: "This is the content of the search result.",
          url: "https://example.com/test",
        },
      ];

      const tokens = estimateSearchResultTokens(results);

      // Should account for title + content + url + overhead
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(30);
    });

    test("should estimate tokens for multiple search results", () => {
      const results = [
        {
          title: "Result 1",
          content: "Content for result 1",
          url: "https://example.com/1",
        },
        {
          title: "Result 2",
          content: "Content for result 2",
          url: "https://example.com/2",
        },
        {
          title: "Result 3",
          content: "Content for result 3",
          url: "https://example.com/3",
        },
      ];

      const tokens = estimateSearchResultTokens(results);

      // Should be roughly 3x the single result estimate
      expect(tokens).toBeGreaterThan(30);
      expect(tokens).toBeLessThan(100);
    });

    test("should handle empty results array", () => {
      const tokens = estimateSearchResultTokens([]);
      expect(tokens).toBe(0);
    });

    test("should handle results with missing fields", () => {
      const results = [
        {
          title: "Only Title",
        },
        {
          content: "Only Content",
        },
        {
          url: "https://example.com",
        },
      ];

      const tokens = estimateSearchResultTokens(results);

      // Should still provide estimate for available fields
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(50);
    });

    test("should include overhead for JSON structure", () => {
      const results = [
        {
          title: "Test",
          content: "Test",
          url: "https://example.com",
        },
      ];

      const tokens = estimateSearchResultTokens(results);

      // Should be more than just the raw text due to overhead
      const rawTextTokens = estimateTokens("TestTesthttps://example.com");
      expect(tokens).toBeGreaterThan(rawTextTokens);
    });

    test("should handle results with additional fields", () => {
      const results = [
        {
          title: "Test Result",
          content: "Test content",
          url: "https://example.com",
          score: 0.95,
          publishedDate: "2024-01-01",
          author: "Test Author",
        },
      ];

      const tokens = estimateSearchResultTokens(results);

      // Should only count title, content, url (not other fields)
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(50);
    });

    test("should be within ±10% tolerance for realistic results", () => {
      const results = [
        {
          title: "Zimbabwe Employment Law Overview",
          content:
            "The Labour Act [Chapter 28:01] is the primary legislation governing employment relationships in Zimbabwe. It covers various aspects including contracts, working conditions, and dispute resolution.",
          url: "https://zimlii.org/zw/legislation/act/2015/1",
        },
      ];

      const tokens = estimateSearchResultTokens(results);

      // Rough calculation: ~240 characters / 4 = ~60 tokens + overhead (5)
      const expected = 70;
      const tolerance = expected * 0.1;

      expect(tokens).toBeGreaterThanOrEqual(expected - tolerance);
      expect(tokens).toBeLessThanOrEqual(expected + tolerance);
    });
  });

  test.describe("TokenTracker", () => {
    test("should initialize with zero tokens", () => {
      const tracker = new TokenTracker();

      expect(tracker.getTotal()).toBe(0);
      expect(tracker.getBreakdown()).toEqual({});
    });

    test("should add tokens for a component", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 100);

      expect(tracker.getTotal()).toBe(100);
      expect(tracker.getBreakdown()).toEqual({ search: 100 });
    });

    test("should accumulate tokens across multiple components", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 100);
      tracker.add("synthesis", 200);
      tracker.add("extraction", 150);

      expect(tracker.getTotal()).toBe(450);
      expect(tracker.getBreakdown()).toEqual({
        search: 100,
        synthesis: 200,
        extraction: 150,
      });
    });

    test("should accumulate tokens for same component", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 100);
      tracker.add("search", 50);
      tracker.add("search", 25);

      expect(tracker.getTotal()).toBe(175);
      expect(tracker.getBreakdown()).toEqual({ search: 175 });
    });

    test("should check if budget is exceeded", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 100);

      expect(tracker.exceedsBudget(150)).toBe(false);
      expect(tracker.exceedsBudget(100)).toBe(false);
      expect(tracker.exceedsBudget(99)).toBe(true);
    });

    test("should reset tracker to zero", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 100);
      tracker.add("synthesis", 200);

      expect(tracker.getTotal()).toBe(300);

      tracker.reset();

      expect(tracker.getTotal()).toBe(0);
      expect(tracker.getBreakdown()).toEqual({});
    });

    test("should return copy of breakdown (not reference)", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 100);

      const breakdown1 = tracker.getBreakdown();
      breakdown1.search = 999; // Modify the returned object

      const breakdown2 = tracker.getBreakdown();

      // Original should not be affected
      expect(breakdown2.search).toBe(100);
    });

    test("should handle zero token additions", () => {
      const tracker = new TokenTracker();

      tracker.add("search", 0);

      expect(tracker.getTotal()).toBe(0);
      expect(tracker.getBreakdown()).toEqual({ search: 0 });
    });

    test("should track realistic workflow token usage", () => {
      const tracker = new TokenTracker();

      // Simulate AUTO mode workflow
      tracker.add("agent", 500);
      tracker.add("search", 800);
      tracker.add("synthesis", 1200);

      expect(tracker.getTotal()).toBe(2500);
      expect(tracker.exceedsBudget(2500)).toBe(false);
      expect(tracker.exceedsBudget(2499)).toBe(true);
    });

    test("should track realistic MEDIUM mode workflow", () => {
      const tracker = new TokenTracker();

      // Simulate MEDIUM mode workflow
      tracker.add("agent", 1000);
      tracker.add("search", 2000);
      tracker.add("extraction", 2500);
      tracker.add("synthesis", 2000);

      expect(tracker.getTotal()).toBe(7500);
      expect(tracker.exceedsBudget(8000)).toBe(false);
    });

    test("should track realistic DEEP mode workflow", () => {
      const tracker = new TokenTracker();

      // Simulate DEEP mode workflow
      tracker.add("agent", 1500);
      tracker.add("initial-research", 5000);
      tracker.add("gap-analysis", 500);
      tracker.add("deep-dive", 10_000);
      tracker.add("synthesis", 3000);

      expect(tracker.getTotal()).toBe(20_000);
      expect(tracker.exceedsBudget(20_000)).toBe(false);
      expect(tracker.exceedsBudget(19_999)).toBe(true);
    });
  });
});
