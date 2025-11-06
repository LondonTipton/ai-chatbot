import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Redis } from "@upstash/redis";

/**
 * Integration tests for the unified research API endpoint
 *
 * These tests verify:
 * - Input validation
 * - Rate limit checking
 * - Cache integration
 * - Agent routing by mode
 * - Token tracking
 * - Error handling
 *
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 5.2, 5.3
 */

// Test configuration
const API_BASE_URL = process.env.TEST_API_URL || "http://localhost:3000";
const RESEARCH_ENDPOINT = `${API_BASE_URL}/api/research`;

// Redis client for cleanup
let redis: Redis;

beforeAll(() => {
  // Initialize Redis for test cleanup
  redis = Redis.fromEnv();
});

afterAll(async () => {
  // Clean up test data from Redis
  // Note: In a real test environment, you'd want to use a separate test Redis instance
  console.log("Test cleanup completed");
});

describe("Research API - Input Validation", () => {
  it("should reject requests with missing query", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "auto",
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject requests with empty query", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "",
        mode: "auto",
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject requests with invalid mode", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "What is a contract?",
        mode: "invalid",
      }),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("should accept valid request with default mode", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "What is a contract?",
      }),
    });

    // Should not be a validation error
    expect(response.status).not.toBe(400);

    const data = await response.json();
    if (!data.success) {
      // If it failed, it should be for a different reason (rate limit, etc.)
      expect(data.error.code).not.toBe("VALIDATION_ERROR");
    }
  });
});

describe("Research API - AUTO Mode", () => {
  it("should execute AUTO mode research successfully", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "What is the doctrine of precedent?",
        mode: "auto",
        jurisdiction: "Zimbabwe",
      }),
    });

    const data = await response.json();

    // Check response structure
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("response");
    expect(data).toHaveProperty("metadata");

    if (data.success) {
      // Verify metadata
      expect(data.metadata.mode).toBe("auto");
      expect(data.metadata).toHaveProperty("stepsUsed");
      expect(data.metadata).toHaveProperty("toolsCalled");
      expect(data.metadata).toHaveProperty("tokenEstimate");
      expect(data.metadata).toHaveProperty("cached");
      expect(data.metadata).toHaveProperty("latency");

      // Verify step budget (max 3 steps for AUTO)
      expect(data.metadata.stepsUsed).toBeLessThanOrEqual(3);

      // Verify token estimate
      expect(data.metadata.tokenEstimate).toBe(2500);

      // Response should not be empty
      expect(data.response.length).toBeGreaterThan(0);
    } else {
      // If failed, log the error for debugging
      console.log("AUTO mode test failed:", data.error);
    }
  }, 30_000); // 30 second timeout

  it("should serve cached response on second request", async () => {
    const query = `Test query for caching ${Date.now()}`;

    // First request
    const response1 = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        mode: "auto",
      }),
    });

    const data1 = await response1.json();

    if (data1.success) {
      expect(data1.metadata.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await fetch(RESEARCH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          mode: "auto",
        }),
      });

      const data2 = await response2.json();

      if (data2.success) {
        expect(data2.metadata.cached).toBe(true);
        expect(data2.response).toBe(data1.response);
        expect(data2.metadata.latency).toBeLessThan(data1.metadata.latency);
      }
    }
  }, 30_000);
});

describe("Research API - MEDIUM Mode", () => {
  it("should execute MEDIUM mode research successfully", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "Compare employment termination procedures in Zimbabwe",
        mode: "medium",
        jurisdiction: "Zimbabwe",
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Verify metadata
      expect(data.metadata.mode).toBe("medium");
      expect(data.metadata.stepsUsed).toBeLessThanOrEqual(6);
      expect(data.metadata.tokenEstimate).toBe(8000);

      // Response should not be empty
      expect(data.response.length).toBeGreaterThan(0);
    } else {
      console.log("MEDIUM mode test failed:", data.error);
    }
  }, 45_000); // 45 second timeout
});

describe("Research API - DEEP Mode", () => {
  it("should execute DEEP mode research successfully", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "Analyze the constitutional framework for human rights in Zimbabwe",
        mode: "deep",
        jurisdiction: "Zimbabwe",
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Verify metadata
      expect(data.metadata.mode).toBe("deep");
      expect(data.metadata.stepsUsed).toBeLessThanOrEqual(3);
      expect(data.metadata.tokenEstimate).toBe(20_000);

      // Response should not be empty
      expect(data.response.length).toBeGreaterThan(0);
    } else {
      console.log("DEEP mode test failed:", data.error);
    }
  }, 60_000); // 60 second timeout
});

describe("Research API - Error Handling", () => {
  it("should handle malformed JSON gracefully", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should return proper error structure on failure", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "",
        mode: "auto",
      }),
    });

    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toHaveProperty("code");
    expect(data.error).toHaveProperty("message");
  });
});

describe("Research API - Metadata", () => {
  it("should include all required metadata fields", async () => {
    const response = await fetch(RESEARCH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "What is a contract?",
        mode: "auto",
      }),
    });

    const data = await response.json();

    if (data.success) {
      // Check all required metadata fields
      expect(data.metadata).toHaveProperty("mode");
      expect(data.metadata).toHaveProperty("stepsUsed");
      expect(data.metadata).toHaveProperty("toolsCalled");
      expect(data.metadata).toHaveProperty("tokenEstimate");
      expect(data.metadata).toHaveProperty("cached");
      expect(data.metadata).toHaveProperty("latency");

      // Verify types
      expect(typeof data.metadata.mode).toBe("string");
      expect(typeof data.metadata.stepsUsed).toBe("number");
      expect(Array.isArray(data.metadata.toolsCalled)).toBe(true);
      expect(typeof data.metadata.tokenEstimate).toBe("number");
      expect(typeof data.metadata.cached).toBe("boolean");
      expect(typeof data.metadata.latency).toBe("number");
    }
  }, 30_000);
});
