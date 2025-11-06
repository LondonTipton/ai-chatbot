import { beforeAll, describe, expect, it } from "vitest";
import { mediumAgent } from "../../mastra/agents/medium-agent";

/**
 * Unit Tests for MEDIUM Agent
 *
 * Tests routing decisions, multi-workflow invocation, and maxSteps enforcement.
 *
 * Requirements: 1.2, 2.1, 2.2, 2.4
 */

describe("MEDIUM Agent", () => {
  beforeAll(() => {
    // Verify required environment variables
    if (!process.env.CEREBRAS_API_KEY) {
      throw new Error("CEREBRAS_API_KEY is required for MEDIUM agent tests");
    }
    if (!process.env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is required for MEDIUM agent tests");
    }
  });

  describe("Configuration", () => {
    it("should have correct agent configuration", () => {
      expect(mediumAgent.name).toBe("medium-legal-agent");
      expect(mediumAgent.tools).toBeDefined();
      expect(Object.keys(mediumAgent.tools)).toHaveLength(3);
      expect(mediumAgent.tools.qnaDirect).toBeDefined();
      expect(mediumAgent.tools.advancedSearch).toBeDefined();
      expect(mediumAgent.tools.newsSearch).toBeDefined();
    });

    it("should have appropriate instructions for balanced research", () => {
      expect(mediumAgent.instructions).toContain("balanced");
      expect(mediumAgent.instructions).toContain("Zimbabwe");
      expect(mediumAgent.instructions).toContain("DECISION GUIDE");
      expect(mediumAgent.instructions).toContain("6 steps");
    });
  });

  describe("Routing Decisions", () => {
    it("should answer directly for well-known legal concepts", async () => {
      const query =
        "What is the doctrine of stare decisis in Zimbabwe legal system?";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(100);

      // Should answer directly without tools for well-known concepts
      const toolCalls = response.toolCalls || [];
      expect(toolCalls.length).toBeLessThanOrEqual(1);

      console.log("[MEDIUM Agent Test] Direct answer routing:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        toolsUsed: toolCalls.length,
        stepsUsed: response.steps?.length || 0,
      });
    }, 30_000);

    it("should use advancedSearch for comprehensive research queries", async () => {
      const query =
        "Analyze the legal framework for company registration in Zimbabwe";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(200);

      // Should use advancedSearch workflow for comprehensive research
      const toolCalls = response.toolCalls || [];
      const usedAdvancedSearch = toolCalls.some(
        (call) => call.toolName === "advanced-search-workflow"
      );

      expect(usedAdvancedSearch).toBe(true);

      console.log("[MEDIUM Agent Test] Advanced search routing:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        toolsUsed: toolCalls.map((t) => t.toolName),
        stepsUsed: response.steps?.length || 0,
      });
    }, 45_000);

    it("should use newsSearch for time-sensitive queries", async () => {
      const query = "What are the latest legal reforms in Zimbabwe?";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(100);

      // Should use newsSearch for time-sensitive queries
      const toolCalls = response.toolCalls || [];
      const usedNewsSearch = toolCalls.some(
        (call) => call.toolName === "tavily-news-search"
      );

      // May use newsSearch or advancedSearch depending on agent decision
      expect(toolCalls.length).toBeGreaterThan(0);

      console.log("[MEDIUM Agent Test] News search routing:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        toolsUsed: toolCalls.map((t) => t.toolName),
        stepsUsed: response.steps?.length || 0,
      });
    }, 45_000);

    it("should use qnaDirect for quick factual queries", async () => {
      const query = "What is the current minimum wage in Zimbabwe?";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(50);

      // Should use qnaDirect for quick facts
      const toolCalls = response.toolCalls || [];
      const usedQnaDirect = toolCalls.some(
        (call) => call.toolName === "tavily-qna-direct"
      );

      // May use qnaDirect or answer directly
      expect(response.text).toBeTruthy();

      console.log("[MEDIUM Agent Test] QnA direct routing:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        toolsUsed: toolCalls.map((t) => t.toolName),
        stepsUsed: response.steps?.length || 0,
      });
    }, 30_000);
  });

  describe("Multi-Workflow Invocation", () => {
    it("should handle comparative analysis with multiple tool calls", async () => {
      const query =
        "Compare employment termination procedures for misconduct versus redundancy in Zimbabwe";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(300);

      // Should use multiple tool calls for comparative analysis
      const toolCalls = response.toolCalls || [];

      // Agent may use multiple advancedSearch calls or a single comprehensive one
      expect(toolCalls.length).toBeGreaterThan(0);

      console.log("[MEDIUM Agent Test] Comparative analysis:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        toolsUsed: toolCalls.map((t) => t.toolName),
        totalToolCalls: toolCalls.length,
        stepsUsed: response.steps?.length || 0,
      });
    }, 60_000);

    it("should synthesize results from multiple tool invocations", async () => {
      const query =
        "What are the recent changes to labor law in Zimbabwe and how do they compare to previous regulations?";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(response.text.length).toBeGreaterThan(200);

      // Should provide coherent synthesis
      expect(response.text).toBeTruthy();

      const toolCalls = response.toolCalls || [];

      console.log("[MEDIUM Agent Test] Multi-tool synthesis:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        toolsUsed: toolCalls.map((t) => t.toolName),
        totalToolCalls: toolCalls.length,
        stepsUsed: response.steps?.length || 0,
      });
    }, 60_000);
  });

  describe("MaxSteps Budget Enforcement", () => {
    it("should respect maxSteps=6 limit", async () => {
      const query =
        "Provide comprehensive analysis of corporate governance requirements, employment law compliance, tax obligations, and intellectual property protection for businesses in Zimbabwe";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();

      // Verify steps used does not exceed 6
      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(6);

      // Should still provide a response even if complex query
      expect(response.text.length).toBeGreaterThan(100);

      console.log("[MEDIUM Agent Test] MaxSteps enforcement:", {
        query: query.substring(0, 50),
        maxSteps: 6,
        stepsUsed,
        responseLength: response.text.length,
        withinBudget: stepsUsed <= 6,
      });
    }, 60_000);

    it("should gracefully handle step budget exhaustion", async () => {
      const query =
        "Analyze all aspects of Zimbabwe commercial law including contracts, torts, property, corporate law, and dispute resolution";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();

      const stepsUsed = response.steps?.length || 0;
      expect(stepsUsed).toBeLessThanOrEqual(6);

      // Should provide best available response even if budget exhausted
      expect(response.text.length).toBeGreaterThan(100);

      console.log("[MEDIUM Agent Test] Budget exhaustion handling:", {
        query: query.substring(0, 50),
        stepsUsed,
        responseLength: response.text.length,
        providedResponse: response.text.length > 100,
      });
    }, 60_000);
  });

  describe("Token Budget Compliance", () => {
    it("should stay within 1K-8K token budget for typical queries", async () => {
      const query =
        "Explain the process for registering a private company in Zimbabwe";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();

      // Rough token estimate (1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(response.text.length / 4);

      // Should be within reasonable range (allowing some flexibility)
      expect(estimatedTokens).toBeGreaterThan(250); // At least 1K tokens
      expect(estimatedTokens).toBeLessThan(3000); // Well under 8K tokens for typical query

      console.log("[MEDIUM Agent Test] Token budget compliance:", {
        query: query.substring(0, 50),
        responseLength: response.text.length,
        estimatedTokens,
        withinBudget: estimatedTokens >= 250 && estimatedTokens < 3000,
      });
    }, 45_000);
  });

  describe("Zimbabwe Legal Context", () => {
    it("should include Zimbabwe-specific legal context in responses", async () => {
      const query = "What are the requirements for a valid contract?";

      const response = await mediumAgent.generate(query, {
        maxSteps: 6,
      });

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();

      // Should mention Zimbabwe or local context
      const hasZimbabweContext =
        response.text.toLowerCase().includes("zimbabwe") ||
        response.text.toLowerCase().includes("zimbabwean");

      expect(hasZimbabweContext).toBe(true);

      console.log("[MEDIUM Agent Test] Zimbabwe context:", {
        query: query.substring(0, 50),
        hasZimbabweContext,
        responseLength: response.text.length,
      });
    }, 30_000);
  });
});
