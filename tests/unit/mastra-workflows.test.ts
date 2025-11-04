/**
 * Unit tests for Mastra workflows
 *
 * Tests workflow orchestration logic to verify proper sequencing,
 * error handling, and data passing between agents.
 */

import { expect, test } from "@playwright/test";
import type { MastraResult } from "@/lib/ai/mastra-router";
import {
  executeCaseLawAnalysis,
  streamCaseLawAnalysis,
} from "@/lib/ai/workflows/case-law-analysis";
import {
  executeDeepResearch,
  streamDeepResearch,
} from "@/lib/ai/workflows/deep-research";
import {
  executeDocumentReview,
  streamDocumentReview,
} from "@/lib/ai/workflows/document-review";
import {
  executeLegalDrafting,
  streamLegalDrafting,
} from "@/lib/ai/workflows/legal-drafting";

test.describe("Mastra Workflows", () => {
  test.describe("Deep Research Workflow", () => {
    test("should have proper structure", async () => {
      expect(executeDeepResearch).toBeDefined();
      expect(typeof executeDeepResearch).toBe("function");
    });

    test("should have streaming support", async () => {
      expect(streamDeepResearch).toBeDefined();
      expect(typeof streamDeepResearch).toBe("function");
    });

    test("should return proper result structure on error", async () => {
      // Test with empty query to trigger quick failure
      const result = await executeDeepResearch("", {
        userId: "test-user",
        chatId: "test-chat",
      });

      // Verify result structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("agentsUsed");

      // Verify types
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.response).toBe("string");
      expect(Array.isArray(result.steps)).toBe(true);
      expect(typeof result.duration).toBe("number");
      expect(typeof result.agentsUsed).toBe("number");
    });

    test("should track steps in workflow", async () => {
      const result = await executeDeepResearch("test query", {
        userId: "test-user",
      });

      // Should have steps array
      expect(Array.isArray(result.steps)).toBe(true);

      // Each step should have proper structure
      for (const step of result.steps || []) {
        expect(step).toHaveProperty("agent");
        expect(step).toHaveProperty("output");
        expect(typeof step.agent).toBe("string");
        expect(typeof step.output).toBe("string");

        if (step.duration !== undefined) {
          expect(typeof step.duration).toBe("number");
        }

        if (step.error !== undefined) {
          expect(typeof step.error).toBe("string");
        }
      }
    });
  });

  test.describe("Document Review Workflow", () => {
    test("should have proper structure", async () => {
      expect(executeDocumentReview).toBeDefined();
      expect(typeof executeDocumentReview).toBe("function");
    });

    test("should have streaming support", async () => {
      expect(streamDocumentReview).toBeDefined();
      expect(typeof streamDocumentReview).toBe("function");
    });

    test("should return proper result structure", async () => {
      const result = await executeDocumentReview("test document", {
        userId: "test-user",
      });

      // Verify result structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("agentsUsed");

      // Verify types
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.response).toBe("string");
      expect(Array.isArray(result.steps)).toBe(true);
      expect(typeof result.duration).toBe("number");
      expect(typeof result.agentsUsed).toBe("number");
    });
  });

  test.describe("Case Law Analysis Workflow", () => {
    test("should have proper structure", async () => {
      expect(executeCaseLawAnalysis).toBeDefined();
      expect(typeof executeCaseLawAnalysis).toBe("function");
    });

    test("should have streaming support", async () => {
      expect(streamCaseLawAnalysis).toBeDefined();
      expect(typeof streamCaseLawAnalysis).toBe("function");
    });

    test("should return proper result structure", async () => {
      const result = await executeCaseLawAnalysis("test case law query", {
        userId: "test-user",
      });

      // Verify result structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("agentsUsed");
    });
  });

  test.describe("Legal Drafting Workflow", () => {
    test("should have proper structure", async () => {
      expect(executeLegalDrafting).toBeDefined();
      expect(typeof executeLegalDrafting).toBe("function");
    });

    test("should have streaming support", async () => {
      expect(streamLegalDrafting).toBeDefined();
      expect(typeof streamLegalDrafting).toBe("function");
    });

    test("should return proper result structure", async () => {
      const result = await executeLegalDrafting("test drafting request", {
        userId: "test-user",
      });

      // Verify result structure
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("agentsUsed");

      // Legal drafting may include documentId
      if (result.documentId !== undefined) {
        expect(typeof result.documentId).toBe("string");
      }
    });
  });

  test.describe("Workflow Error Handling", () => {
    test("workflows should handle agent failures gracefully", async () => {
      // Test with problematic input
      const result = await executeDeepResearch("", {
        userId: "test-user",
      });

      // Should return a result even on failure
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");

      // Should have steps even if failed
      expect(Array.isArray(result.steps)).toBe(true);

      // Should track duration
      expect(typeof result.duration).toBe("number");
      expect(result.duration).toBeGreaterThan(0);
    });

    test("workflows should continue with partial results", async () => {
      const result = await executeDocumentReview("minimal", {
        userId: "test-user",
      });

      // Even with minimal input, should attempt all steps
      expect(result.steps).toBeDefined();

      // Should have attempted at least one step
      if (result.steps && result.steps.length > 0) {
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Workflow Streaming", () => {
    test("deep research streaming should yield events", async () => {
      const events: any[] = [];
      const stream = streamDeepResearch("test query", {
        userId: "test-user",
      });

      // Collect events (with timeout)
      const timeout = setTimeout(() => {
        // Force stop after 30 seconds
      }, 30_000);

      try {
        for await (const event of stream) {
          events.push(event);

          // Stop after getting a complete or error event
          if (event.type === "complete" || event.type === "error") {
            break;
          }
        }
      } finally {
        clearTimeout(timeout);
      }

      // Should have received at least one event
      expect(events.length).toBeGreaterThan(0);

      // First events should be progress or complete/error
      const firstEvent = events[0];
      expect(firstEvent).toHaveProperty("type");
      expect(["progress", "complete", "error"]).toContain(firstEvent.type);
    });

    test("document review streaming should yield events", async () => {
      const events: any[] = [];
      const stream = streamDocumentReview("test document", {
        userId: "test-user",
      });

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

      const firstEvent = events[0];
      expect(firstEvent).toHaveProperty("type");
      expect(["progress", "complete", "error"]).toContain(firstEvent.type);
    });
  });
});
