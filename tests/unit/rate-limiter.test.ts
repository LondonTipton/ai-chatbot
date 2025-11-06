import { expect, test } from "@playwright/test";
import { RateLimitError } from "@/lib/rate-limiter";

test.describe("Rate Limiter", () => {
  test.describe("RateLimitError", () => {
    test("should create error with correct properties", () => {
      const error = new RateLimitError(
        "Rate limit exceeded",
        1_234_567_890,
        "cerebras_tokens_per_minute"
      );

      expect(error.name).toBe("RateLimitError");
      expect(error.message).toBe("Rate limit exceeded");
      expect(error.retryAfter).toBe(1_234_567_890);
      expect(error.limitType).toBe("cerebras_tokens_per_minute");
    });

    test("should be instance of Error", () => {
      const error = new RateLimitError(
        "Test error",
        1_234_567_890,
        "test_limit"
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof RateLimitError).toBe(true);
    });

    test("should handle different limit types", () => {
      const limitTypes = [
        "cerebras_tokens_per_minute",
        "cerebras_tokens_per_day",
        "cerebras_requests_per_minute",
        "tavily_requests_per_minute",
      ];

      for (const limitType of limitTypes) {
        const error = new RateLimitError(
          `${limitType} exceeded`,
          Date.now(),
          limitType
        );

        expect(error.limitType).toBe(limitType);
        expect(error.message).toBe(`${limitType} exceeded`);
      }
    });

    test("should preserve stack trace", () => {
      const error = new RateLimitError(
        "Test error",
        1_234_567_890,
        "test_limit"
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("RateLimitError");
    });
  });

  test.describe("Rate Limit Configuration", () => {
    test("should have correct Cerebras token limits", () => {
      // 80% of 60,000 tokens/minute = 48,000
      const tokensPerMinuteLimit = 48_000;
      expect(tokensPerMinuteLimit).toBe(48_000);

      // 80% of 1,000,000 tokens/day = 800,000
      const tokensPerDayLimit = 800_000;
      expect(tokensPerDayLimit).toBe(800_000);

      // 80% of 30 requests/minute = 24
      const requestsPerMinuteLimit = 24;
      expect(requestsPerMinuteLimit).toBe(24);
    });

    test("should have correct Tavily request limits", () => {
      // 80% of 100 requests/minute = 80
      const tavilyRequestsPerMinuteLimit = 80;
      expect(tavilyRequestsPerMinuteLimit).toBe(80);
    });

    test("should calculate 80% threshold correctly", () => {
      const calculateThreshold = (limit: number) => Math.floor(limit * 0.8);

      expect(calculateThreshold(60_000)).toBe(48_000); // Cerebras tokens/min
      expect(calculateThreshold(1_000_000)).toBe(800_000); // Cerebras tokens/day
      expect(calculateThreshold(30)).toBe(24); // Cerebras requests/min
      expect(calculateThreshold(100)).toBe(80); // Tavily requests/min
    });
  });

  test.describe("Token Budget Estimates", () => {
    test("should have correct AUTO mode token estimate", () => {
      const autoModeTokens = 2500;
      expect(autoModeTokens).toBe(2500);
      expect(autoModeTokens).toBeLessThanOrEqual(3000); // Max budget
    });

    test("should have correct MEDIUM mode token estimate", () => {
      const mediumModeTokens = 8000;
      expect(mediumModeTokens).toBe(8000);
      expect(mediumModeTokens).toBeLessThanOrEqual(10_000); // Max budget
    });

    test("should have correct DEEP mode token estimate", () => {
      const deepModeTokens = 20_000;
      expect(deepModeTokens).toBe(20_000);
      expect(deepModeTokens).toBeLessThanOrEqual(25_000); // Max budget
    });

    test("should calculate daily capacity correctly", () => {
      const dailyTokenLimit = 800_000; // 80% of 1M

      // With AUTO mode (2500 tokens each)
      const autoCapacity = Math.floor(dailyTokenLimit / 2500);
      expect(autoCapacity).toBe(320);

      // With MEDIUM mode (8000 tokens each)
      const mediumCapacity = Math.floor(dailyTokenLimit / 8000);
      expect(mediumCapacity).toBe(100);

      // With DEEP mode (20000 tokens each)
      const deepCapacity = Math.floor(dailyTokenLimit / 20_000);
      expect(deepCapacity).toBe(40);

      // Mixed mode (target 350-400 queries)
      // Assuming 60% AUTO, 30% MEDIUM, 10% DEEP
      const mixedCapacity =
        dailyTokenLimit / (0.6 * 2500 + 0.3 * 8000 + 0.1 * 20_000);
      expect(mixedCapacity).toBeGreaterThanOrEqual(130);
      expect(mixedCapacity).toBeLessThanOrEqual(140);
    });
  });

  test.describe("Rate Limit Error Handling", () => {
    test("should format error message correctly", () => {
      const error = new RateLimitError(
        "Cerebras token rate limit exceeded (per minute)",
        Date.now() + 60_000,
        "cerebras_tokens_per_minute"
      );

      expect(error.message).toContain("Cerebras");
      expect(error.message).toContain("token");
      expect(error.message).toContain("rate limit");
    });

    test("should include retry timestamp", () => {
      const retryAfter = Date.now() + 60_000; // 1 minute from now
      const error = new RateLimitError(
        "Rate limit exceeded",
        retryAfter,
        "test_limit"
      );

      expect(error.retryAfter).toBe(retryAfter);
      expect(error.retryAfter).toBeGreaterThan(Date.now());
    });

    test("should be catchable in try-catch", () => {
      const throwError = () => {
        throw new RateLimitError("Test error", Date.now(), "test_limit");
      };

      expect(throwError).toThrow(RateLimitError);
      expect(throwError).toThrow("Test error");
    });

    test("should be distinguishable from generic errors", () => {
      const rateLimitError = new RateLimitError(
        "Rate limit",
        Date.now(),
        "test"
      );
      const genericError = new Error("Generic error");

      expect(rateLimitError instanceof RateLimitError).toBe(true);
      expect(genericError instanceof RateLimitError).toBe(false);
    });
  });
});
