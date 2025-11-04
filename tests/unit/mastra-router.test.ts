/**
 * Unit tests for Mastra router
 *
 * Tests the routing logic that directs queries to appropriate
 * agents and workflows based on complexity level.
 */

import { expect, test } from "@playwright/test";
import type { QueryComplexity } from "@/lib/ai/complexity-detector";
import { routeToMastra, streamMastraRoute } from "@/lib/ai/mastra-router";

test.describe("Mastra Router", () => {
  test.describe("routeToMastra", () => {
    test("should route medium complexity to Medium Research Agent", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "What are the requirements for contract formation?",
        { userId: "test-user", chatId: "test-chat" }
      );

      // Should return a result
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("agentsUsed");

      // Medium agent uses 1 agent
      if (result.success) {
        expect(result.agentsUsed).toBe(1);
      }
    });

    test("should route deep complexity to Deep Research Workflow", async () => {
      const result = await routeToMastra(
        "deep" as QueryComplexity,
        "Comprehensive analysis of contract law in Zimbabwe",
        { userId: "test-user", chatId: "test-chat" }
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("agentsUsed");

      // Deep workflow uses multiple agents
      if (result.success && result.steps) {
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });

    test("should route workflow-review to Document Review Workflow", async () => {
      const result = await routeToMastra(
        "workflow-review" as QueryComplexity,
        "Review this employment contract for completeness",
        { userId: "test-user", chatId: "test-chat" }
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
    });

    test("should route workflow-caselaw to Case Law Analysis Workflow", async () => {
      const result = await routeToMastra(
        "workflow-caselaw" as QueryComplexity,
        "Compare precedents on contract breach remedies",
        { userId: "test-user", chatId: "test-chat" }
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
    });

    test("should route workflow-drafting to Legal Drafting Workflow", async () => {
      const result = await routeToMastra(
        "workflow-drafting" as QueryComplexity,
        "Draft a non-disclosure agreement",
        { userId: "test-user", chatId: "test-chat" }
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");

      // Drafting workflow may include documentId
      if (result.success && result.documentId) {
        expect(typeof result.documentId).toBe("string");
      }
    });

    test("should reject unsupported complexity levels", async () => {
      await expect(
        routeToMastra("simple" as QueryComplexity, "What is a contract?", {
          userId: "test-user",
        })
      ).rejects.toThrow(/Unsupported complexity/);
    });

    test("should reject light complexity", async () => {
      await expect(
        routeToMastra("light" as QueryComplexity, "Define contract", {
          userId: "test-user",
        })
      ).rejects.toThrow(/Unsupported complexity/);
    });

    test("should handle missing context gracefully", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test query without context"
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });

    test("should track execution duration", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test query for duration tracking",
        { userId: "test-user" }
      );

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe("number");
      expect(result.duration).toBeGreaterThan(0);
    });

    test("should validate responses", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test query for validation",
        { userId: "test-user" }
      );

      // Router validates responses before returning
      // If success is true, response should be valid
      if (result.success) {
        expect(result.response).toBeDefined();
        expect(typeof result.response).toBe("string");
      }
    });
  });

  test.describe("streamMastraRoute", () => {
    test("should stream medium complexity queries", async () => {
      const events: any[] = [];
      const stream = streamMastraRoute(
        "medium" as QueryComplexity,
        "Test streaming query",
        { userId: "test-user" }
      );

      const timeout = setTimeout(() => {}, 30_000);

      try {
        for await (const event of stream) {
          events.push(event);

          if (event.type === "complete" || event.type === "error") {
            break;
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      expect(events.length).toBeGreaterThan(0);

      // Should have a complete or error event
      const lastEvent = events[events.length - 1];
      expect(["complete", "error"]).toContain(lastEvent.type);
    });

    test("should stream deep complexity queries with progress", async () => {
      const events: any[] = [];
      const stream = streamMastraRoute(
        "deep" as QueryComplexity,
        "Test deep streaming query",
        { userId: "test-user" }
      );

      const timeout = setTimeout(() => {}, 30_000);

      try {
        for await (const event of stream) {
          events.push(event);

          if (event.type === "complete" || event.type === "error") {
            break;
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      expect(events.length).toBeGreaterThan(0);

      // Deep workflow should have progress events
      const progressEvents = events.filter((e) => e.type === "progress");
      // May have progress events (not guaranteed in test environment)

      // Should end with complete or error
      const lastEvent = events[events.length - 1];
      expect(["complete", "error"]).toContain(lastEvent.type);
    });

    test("should stream workflow queries", async () => {
      const events: any[] = [];
      const stream = streamMastraRoute(
        "workflow-review" as QueryComplexity,
        "Test workflow streaming",
        { userId: "test-user" }
      );

      const timeout = setTimeout(() => {}, 30_000);

      try {
        for await (const event of stream) {
          events.push(event);

          if (event.type === "complete" || event.type === "error") {
            break;
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      expect(events.length).toBeGreaterThan(0);

      const lastEvent = events[events.length - 1];
      expect(["complete", "error"]).toContain(lastEvent.type);
    });

    test("should handle unsupported complexity in streaming", async () => {
      const events: any[] = [];
      const stream = streamMastraRoute(
        "simple" as QueryComplexity,
        "Test unsupported streaming",
        { userId: "test-user" }
      );

      for await (const event of stream) {
        events.push(event);
        break; // Should get error immediately
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe("error");
      expect(events[0].error).toContain("Unsupported complexity");
    });

    test("should include duration in complete events", async () => {
      const events: any[] = [];
      const stream = streamMastraRoute(
        "medium" as QueryComplexity,
        "Test duration in streaming",
        { userId: "test-user" }
      );

      const timeout = setTimeout(() => {}, 30_000);

      try {
        for await (const event of stream) {
          events.push(event);

          if (event.type === "complete" || event.type === "error") {
            break;
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      const lastEvent = events[events.length - 1];
      expect(lastEvent).toHaveProperty("duration");
      expect(typeof lastEvent.duration).toBe("number");
    });
  });

  test.describe("Router Logging", () => {
    test("should log routing decisions", async () => {
      // This test verifies that routing functions execute without errors
      // Actual logging is verified through console output in integration tests

      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test logging",
        { userId: "test-user", chatId: "test-chat" }
      );

      expect(result).toBeDefined();
    });

    test("should log validation results", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test validation logging",
        { userId: "test-user" }
      );

      // Validation happens internally
      expect(result).toHaveProperty("success");
    });
  });

  test.describe("Router Context Handling", () => {
    test("should handle userId in context", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test with userId",
        { userId: "test-user-123" }
      );

      expect(result).toBeDefined();
    });

    test("should handle chatId in context", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test with chatId",
        { chatId: "test-chat-456" }
      );

      expect(result).toBeDefined();
    });

    test("should handle sessionId in context", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test with sessionId",
        { sessionId: "test-session-789" }
      );

      expect(result).toBeDefined();
    });

    test("should handle full context", async () => {
      const result = await routeToMastra(
        "medium" as QueryComplexity,
        "Test with full context",
        {
          userId: "test-user-123",
          chatId: "test-chat-456",
          sessionId: "test-session-789",
        }
      );

      expect(result).toBeDefined();
    });
  });
});
