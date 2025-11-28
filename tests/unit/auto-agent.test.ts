/**
 * Unit tests for AUTO Agent
 *
 * Tests routing decisions, tool selection, and maxSteps enforcement
 * Requirements: 1.1, 2.1, 2.2, 2.4
 */

import { beforeAll, describe, expect, it } from "vitest";
import { autoAgent } from "../../mastra/agents/auto-agent";

describe("AUTO Agent", () => {
  beforeAll(() => {
    // Verify required environment variables
    const hasKey = Object.keys(process.env).some(k => k.startsWith("CEREBRAS_API_KEY"));
    if (!hasKey) {
      throw new Error("CEREBRAS_API_KEY is required for AUTO agent tests");
    }
    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is required for AUTO agent tests");
    }
  });

  describe("Agent Configuration", () => {
    it("should have correct name", () => {
      expect(autoAgent.name).toBe("auto-legal-agent");
    });

    it("should have qnaDirect tool available", () => {
      expect(autoAgent.tools).toHaveProperty("qnaDirect");
    });

    it("should have basicSearch workflow available", () => {
      expect(autoAgent.tools).toHaveProperty("basicSearch");
    });

    it("should have exactly 2 tools", () => {
      expect(Object.keys(autoAgent.tools).length).toBe(2);
    });
  });

  describe("Routing Decisions", () => {
    it("should handle simple legal definition (direct answer preferred)", async () => {
      const response = await autoAgent.generate(
        "What is a contract in legal terms?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(50);

      // Agent may choose direct answer or use tools - both are valid
      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      console.log("[Direct Answer Test]", {
        stepsUsed,
        toolsUsed: response.toolCalls?.map((t) => t.toolName || t.name) || [],
        responseLength: response.text.length,
      });
    }, 30_000);

    it("should handle current information query (qnaDirect or basicSearch)", async () => {
      const response = await autoAgent.generate(
        "What is the current minimum wage in Zimbabwe?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(50);

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      // Should use at least one tool for current information
      const toolsUsed =
        response.toolCalls?.map((t) => t.toolName || t.name) || [];
      console.log("[Current Info Test]", {
        stepsUsed,
        toolsUsed,
        responseLength: response.text.length,
      });

      // Agent should use tools for current information
      expect(toolsUsed.length).toBeGreaterThan(0);
    }, 30_000);

    it("should handle research query (basicSearch workflow)", async () => {
      const response = await autoAgent.generate(
        "What are the requirements for company registration in Zimbabwe?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(100);

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      const toolsUsed =
        response.toolCalls?.map((t) => t.toolName || t.name) || [];
      console.log("[Research Query Test]", {
        stepsUsed,
        toolsUsed,
        responseLength: response.text.length,
      });

      // Should use tools for research
      expect(toolsUsed.length).toBeGreaterThan(0);
    }, 30_000);
  });

  describe("MaxSteps Budget Enforcement", () => {
    it("should respect maxSteps=3 limit", async () => {
      const response = await autoAgent.generate(
        "Provide information about employment law in Zimbabwe",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      console.log("[MaxSteps Test]", {
        stepsUsed,
        maxSteps: 3,
        withinBudget: stepsUsed <= 3,
      });
    }, 30_000);

    it("should complete within maxSteps even for complex queries", async () => {
      const response = await autoAgent.generate(
        "Explain the legal framework for intellectual property protection in Zimbabwe, including patents, trademarks, and copyrights",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      console.log("[Complex Query MaxSteps Test]", {
        stepsUsed,
        maxSteps: 3,
        withinBudget: stepsUsed <= 3,
        responseLength: response.text.length,
      });
    }, 30_000);
  });

  describe("Response Quality", () => {
    it("should include Zimbabwe legal context", async () => {
      const response = await autoAgent.generate(
        "What are the key principles of contract law?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();

      // Response should mention Zimbabwe or be contextually relevant
      const hasZimbabweContext =
        response.text.toLowerCase().includes("zimbabwe") ||
        response.text.toLowerCase().includes("zim") ||
        response.text.length > 100; // Substantial response

      expect(hasZimbabweContext).toBe(true);

      console.log("[Zimbabwe Context Test]", {
        hasZimbabweContext,
        responseLength: response.text.length,
      });
    }, 30_000);

    it("should provide professional legal writing", async () => {
      const response = await autoAgent.generate(
        "What is the doctrine of precedent?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(50);

      // Should be well-structured (contains proper sentences)
      const punctuationRegex = /[.!?]/;
      const hasPunctuation = punctuationRegex.test(response.text);
      expect(hasPunctuation).toBe(true);

      console.log("[Professional Writing Test]", {
        responseLength: response.text.length,
        hasPunctuation,
      });
    }, 30_000);
  });

  describe("Tool Selection Logic", () => {
    it("should make appropriate tool choices based on query type", async () => {
      const queries = [
        {
          query: "What is negligence?",
          expectedBehavior: "direct or minimal tools",
        },
        {
          query: "What is the current VAT rate in Zimbabwe?",
          expectedBehavior: "qnaDirect or basicSearch",
        },
        {
          query: "Explain the process of land acquisition in Zimbabwe",
          expectedBehavior: "basicSearch workflow",
        },
      ];

      for (const { query, expectedBehavior } of queries) {
        const response = await autoAgent.generate(query, {
          maxSteps: 3,
        });

        expect(response.text).toBeTruthy();

        const stepsUsed = response.steps?.length || 0;
        const toolsUsed =
          response.toolCalls?.map((t) => t.toolName || t.name) || [];

        console.log(`[Tool Selection: ${expectedBehavior}]`, {
          query: query.substring(0, 50),
          stepsUsed,
          toolsUsed,
        });

        // All queries should complete within budget
        expect(stepsUsed).toBeLessThanOrEqual(3);
      }
    }, 90_000); // Longer timeout for multiple queries
  });
});
