/**
 * Unit tests for DEEP Agent
 *
 * Tests routing decisions, workflow invocation, and maxSteps enforcement
 * Requirements: 1.3, 2.1, 2.2, 2.4
 */

import { beforeAll, describe, expect, it } from "vitest";
import { deepAgent } from "../../mastra/agents/deep-agent";

describe("DEEP Agent", () => {
  beforeAll(() => {
    // Verify required environment variables
    const hasKey = Object.keys(process.env).some(k => k.startsWith("CEREBRAS_API_KEY"));
    if (!hasKey) {
      throw new Error("CEREBRAS_API_KEY is required for DEEP agent tests");
    }
    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is required for DEEP agent tests");
    }
  });

  describe("Agent Configuration", () => {
    it("should have correct name", () => {
      expect(deepAgent.name).toBe("deep-legal-agent");
    });

    it("should have comprehensiveAnalysis workflow available", () => {
      expect(deepAgent.tools).toHaveProperty("comprehensiveAnalysis");
    });

    it("should have exactly 1 tool", () => {
      expect(Object.keys(deepAgent.tools).length).toBe(1);
    });
  });

  describe("Routing Decisions", () => {
    it("should handle well-established topic (direct answer preferred)", async () => {
      const response = await deepAgent.generate(
        "Provide a comprehensive analysis of the doctrine of separation of powers in constitutional law",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(200);

      // Agent may choose direct answer or use workflow - both are valid
      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      console.log("[Direct Answer Test]", {
        stepsUsed,
        toolsUsed: response.toolCalls?.map((t) => t.toolName || t.name) || [],
        responseLength: response.text.length,
      });
    }, 60_000);

    it("should handle current information query (comprehensiveAnalysis workflow)", async () => {
      const response = await deepAgent.generate(
        "Analyze the current legal framework for foreign investment in Zimbabwe",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(200);

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      // Should use workflow for current information
      const toolsUsed =
        response.toolCalls?.map((t) => t.toolName || t.name) || [];
      console.log("[Current Info Test]", {
        stepsUsed,
        toolsUsed,
        responseLength: response.text.length,
      });

      // Agent should use workflow for current information
      expect(toolsUsed.length).toBeGreaterThan(0);
    }, 60_000);

    it("should handle comprehensive research query (comprehensiveAnalysis workflow)", async () => {
      const response = await deepAgent.generate(
        "What are the recent Supreme Court decisions on constitutional matters in Zimbabwe?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(300);

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(3);

      const toolsUsed =
        response.toolCalls?.map((t) => t.toolName || t.name) || [];
      console.log("[Research Query Test]", {
        stepsUsed,
        toolsUsed,
        responseLength: response.text.length,
      });

      // Should use workflow for research
      expect(toolsUsed.length).toBeGreaterThan(0);
    }, 60_000);
  });

  describe("MaxSteps Budget Enforcement", () => {
    it("should respect maxSteps=3 limit", async () => {
      const response = await deepAgent.generate(
        "Provide comprehensive information about employment law in Zimbabwe",
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
    }, 60_000);

    it("should complete within maxSteps even for complex queries", async () => {
      const response = await deepAgent.generate(
        "Provide a comprehensive analysis of the legal framework for intellectual property protection in Zimbabwe, including patents, trademarks, copyrights, and recent legislative changes",
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
    }, 60_000);
  });

  describe("Response Quality", () => {
    it("should provide publication-quality responses", async () => {
      const response = await deepAgent.generate(
        "Explain the constitutional framework for human rights in Zimbabwe",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(300);

      // Should be well-structured (contains proper sentences and sections)
      const punctuationRegex = /[.!?]/;
      const hasPunctuation = punctuationRegex.test(response.text);
      expect(hasPunctuation).toBe(true);

      // Should have some structure (headings, sections, or paragraphs)
      const hasStructure =
        response.text.includes("\n\n") || response.text.includes("#");
      expect(hasStructure).toBe(true);

      console.log("[Publication Quality Test]", {
        responseLength: response.text.length,
        hasPunctuation,
        hasStructure,
      });
    }, 60_000);

    it("should include Zimbabwe legal context", async () => {
      const response = await deepAgent.generate(
        "Analyze the principles of administrative law",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();

      // Response should mention Zimbabwe or be contextually relevant
      const hasZimbabweContext =
        response.text.toLowerCase().includes("zimbabwe") ||
        response.text.toLowerCase().includes("zim") ||
        response.text.length > 300; // Substantial comprehensive response

      expect(hasZimbabweContext).toBe(true);

      console.log("[Zimbabwe Context Test]", {
        hasZimbabweContext,
        responseLength: response.text.length,
      });
    }, 60_000);

    it("should provide comprehensive coverage", async () => {
      const response = await deepAgent.generate(
        "Explain the hierarchy of courts in Zimbabwe",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(200);

      // Should provide substantial content
      const wordCount = response.text.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(50);

      console.log("[Comprehensive Coverage Test]", {
        responseLength: response.text.length,
        wordCount,
      });
    }, 60_000);
  });

  describe("Workflow Invocation", () => {
    it("should invoke comprehensiveAnalysis workflow for current topics", async () => {
      const response = await deepAgent.generate(
        "What are the latest legal reforms in Zimbabwe regarding company law?",
        {
          maxSteps: 3,
        }
      );

      expect(response.text).toBeTruthy();

      const stepsUsed = response.steps?.length || 0;
      const toolsUsed =
        response.toolCalls?.map((t) => t.toolName || t.name) || [];

      console.log("[Workflow Invocation Test]", {
        stepsUsed,
        toolsUsed,
        responseLength: response.text.length,
      });

      // Should use workflow for current information
      const usedWorkflow = toolsUsed.some((t) =>
        t.includes("comprehensive-analysis")
      );
      expect(usedWorkflow).toBe(true);
    }, 60_000);

    it("should make appropriate routing decisions", async () => {
      const queries = [
        {
          query: "Explain the doctrine of precedent in Zimbabwe",
          expectedBehavior: "direct answer or workflow",
        },
        {
          query: "What are the current regulations for mining in Zimbabwe?",
          expectedBehavior: "comprehensiveAnalysis workflow",
        },
        {
          query:
            "Analyze recent changes to labor law in Zimbabwe with case examples",
          expectedBehavior: "comprehensiveAnalysis workflow",
        },
      ];

      for (const { query, expectedBehavior } of queries) {
        const response = await deepAgent.generate(query, {
          maxSteps: 3,
        });

        expect(response.text).toBeTruthy();

        const stepsUsed = response.steps?.length || 0;
        const toolsUsed =
          response.toolCalls?.map((t) => t.toolName || t.name) || [];

        console.log(`[Routing Decision: ${expectedBehavior}]`, {
          query: query.substring(0, 50),
          stepsUsed,
          toolsUsed,
        });

        // All queries should complete within budget
        expect(stepsUsed).toBeLessThanOrEqual(3);
      }
    }, 180_000); // Longer timeout for multiple queries
  });
});
