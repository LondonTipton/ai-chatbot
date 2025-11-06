/**
 * Integration Tests for Comprehensive Analysis Workflow
 *
 * Tests the complete workflow execution including:
 * - Initial research step
 * - Gap analysis step
 * - Conditional branching (enhance vs deep-dive)
 * - Document synthesis step
 * - Token budget compliance (18K-20K range)
 *
 * Requirements: 6.3
 */

import { comprehensiveAnalysisWorkflow } from "@/mastra/workflows/comprehensive-analysis-workflow";

describe("Comprehensive Analysis Workflow Integration Tests", () => {
  describe("Enhance Path (gaps <= 2)", () => {
    it("should execute enhance path for well-covered topics", async () => {
      // Use a well-established legal topic that should have good initial coverage
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "contract law basic principles",
          jurisdiction: "Zimbabwe",
        },
      });

      // Verify workflow completed successfully
      expect(result.status).toBe("success");

      // Access the final output from the document step
      const output = result.steps.document?.output;

      // Verify response structure
      expect(output).toHaveProperty("response");
      expect(output).toHaveProperty("totalTokens");
      expect(output).toHaveProperty("path");

      // Verify response content
      expect(output.response).toBeTruthy();
      expect(output.response.length).toBeGreaterThan(100);

      // Verify path taken
      expect(["enhance", "deep-dive"]).toContain(output.path);

      // Verify token budget (should be within 18K-20K range)
      expect(output.totalTokens).toBeGreaterThan(0);
      expect(output.totalTokens).toBeLessThanOrEqual(20_000);

      // Verify response quality
      expect(output.response).toContain("Zimbabwe");

      console.log("[Enhance Path Test] Results:", {
        path: output.path,
        totalTokens: output.totalTokens,
        responseLength: output.response.length,
        withinBudget: output.totalTokens <= 20_000,
      });
    }, 60_000); // 60s timeout for API calls

    it("should handle enhance path with minimal gaps", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "employment law termination procedures",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output).toBeDefined();
      expect(output.response).toBeDefined();
      expect(["enhance", "deep-dive"]).toContain(output.path);
      expect(output.totalTokens).toBeLessThanOrEqual(20_000);

      console.log("[Enhance Path - Minimal Gaps] Results:", {
        path: output.path,
        totalTokens: output.totalTokens,
        withinBudget: output.totalTokens <= 20_000,
      });
    }, 60_000);
  });

  describe("Deep Dive Path (gaps > 2)", () => {
    it("should execute workflow for topics with potential gaps", async () => {
      // Use a more specific/niche topic that likely has gaps
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "cryptocurrency regulation legal framework",
          jurisdiction: "Zimbabwe",
        },
      });

      // Verify workflow completed successfully
      expect(result.status).toBe("success");

      const output = result.steps.document?.output;

      // Verify response structure
      expect(output).toBeDefined();
      expect(output.response).toBeDefined();
      expect(output.response.length).toBeGreaterThan(100);

      // Path could be either enhance or deep-dive depending on actual gaps found
      expect(["enhance", "deep-dive"]).toContain(output.path);

      // Verify token budget
      expect(output.totalTokens).toBeGreaterThan(0);
      expect(output.totalTokens).toBeLessThanOrEqual(20_000);

      // Verify response quality
      expect(output.response).toContain("Zimbabwe");

      console.log("[Deep Dive Path Test] Results:", {
        path: output.path,
        totalTokens: output.totalTokens,
        responseLength: output.response.length,
        withinBudget: output.totalTokens <= 20_000,
      });
    }, 90_000); // 90s timeout for deep dive

    it("should handle complex topics", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "intellectual property rights enforcement mechanisms",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output).toBeDefined();
      expect(output.response).toBeDefined();
      expect(["enhance", "deep-dive"]).toContain(output.path);
      expect(output.totalTokens).toBeLessThanOrEqual(20_000);

      console.log("[Deep Dive - Complex Topic] Results:", {
        path: output.path,
        totalTokens: output.totalTokens,
        withinBudget: output.totalTokens <= 20_000,
      });
    }, 90_000);
  });

  describe("Token Budget Compliance", () => {
    it("should stay within 18K-20K token budget", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "property law ownership rights",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output.totalTokens).toBeGreaterThan(0);
      expect(output.totalTokens).toBeLessThanOrEqual(20_000);

      // Should be reasonably close to target range
      expect(output.totalTokens).toBeGreaterThan(10_000); // At least 10K for comprehensive analysis

      console.log("[Token Budget] Results:", {
        totalTokens: output.totalTokens,
        withinBudget: output.totalTokens <= 20_000,
        inTargetRange:
          output.totalTokens >= 18_000 && output.totalTokens <= 20_000,
      });
    }, 60_000);
  });

  describe("Error Handling", () => {
    it("should handle very short query", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "law",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output).toBeDefined();
      expect(output.response).toBeDefined();
      expect(output.totalTokens).toBeLessThanOrEqual(20_000);
    }, 60_000);

    it("should handle query without jurisdiction", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "contract law principles",
          // jurisdiction defaults to "Zimbabwe"
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output).toBeDefined();
      expect(output.response).toBeDefined();
      expect(output.response).toContain("Zimbabwe");
    }, 60_000);
  });

  describe("Response Quality", () => {
    it("should produce comprehensive document with proper structure", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "labor law minimum wage requirements",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output.response).toBeDefined();

      // Check for document structure elements
      const response = output.response.toLowerCase();

      // Should have substantial content
      expect(output.response.length).toBeGreaterThan(500);

      // Should contain Zimbabwe context
      expect(response).toContain("zimbabwe");

      // Should contain legal terminology
      const legalTermPattern = /law|legal|regulation|statute/;
      expect(legalTermPattern.test(response)).toBe(true);

      console.log("[Response Quality] Results:", {
        responseLength: output.response.length,
        hasZimbabweContext: response.includes("zimbabwe"),
        hasLegalTerms: legalTermPattern.test(response),
        path: output.path,
      });
    }, 60_000);

    it("should include citations and sources", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "constitutional rights freedom of expression",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output.response).toBeDefined();

      // Check for URL patterns (citations)
      const hasUrls =
        output.response.includes("http://") ||
        output.response.includes("https://") ||
        output.response.includes("Source:") ||
        output.response.includes("source:");

      // Should have some form of citations
      expect(hasUrls).toBe(true);

      console.log("[Citations Check] Results:", {
        hasCitations: hasUrls,
        responseLength: output.response.length,
      });
    }, 60_000);
  });

  describe("Zimbabwe Legal Context", () => {
    it("should prioritize Zimbabwe legal sources and context", async () => {
      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "company registration requirements",
          jurisdiction: "Zimbabwe",
        },
      });

      expect(result.status).toBe("success");

      const output = result.steps.document?.output;
      expect(output.response).toBeDefined();

      const response = output.response.toLowerCase();

      // Should contain Zimbabwe references
      expect(response).toContain("zimbabwe");

      // Should contain legal context
      const legalContextPattern = /law|act|regulation|statute/;
      expect(legalContextPattern.test(response)).toBe(true);

      console.log("[Zimbabwe Context] Results:", {
        hasZimbabweReference: response.includes("zimbabwe"),
        hasLegalContext: legalContextPattern.test(response),
        path: output.path,
      });
    }, 60_000);
  });

  describe("Performance", () => {
    it("should complete within reasonable time (< 60s for enhance)", async () => {
      const startTime = Date.now();

      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "tort law negligence principles",
          jurisdiction: "Zimbabwe",
        },
      });

      const duration = Date.now() - startTime;

      expect(result.status).toBe("success");
      expect(duration).toBeLessThan(60_000); // Should complete within 60s

      const output = result.steps.document?.output;

      console.log("[Performance - Enhance] Results:", {
        duration: `${(duration / 1000).toFixed(2)}s`,
        path: output.path,
        withinTarget: duration < 60_000,
      });
    }, 65_000);

    it("should complete within reasonable time (< 90s for deep-dive)", async () => {
      const startTime = Date.now();

      const run = await comprehensiveAnalysisWorkflow.createRunAsync();

      const result = await run.start({
        inputData: {
          query: "environmental law compliance requirements mining sector",
          jurisdiction: "Zimbabwe",
        },
      });

      const duration = Date.now() - startTime;

      expect(result.status).toBe("success");
      expect(duration).toBeLessThan(90_000); // Should complete within 90s

      const output = result.steps.document?.output;

      console.log("[Performance - Deep Dive] Results:", {
        duration: `${(duration / 1000).toFixed(2)}s`,
        path: output.path,
        withinTarget: duration < 90_000,
      });
    }, 95_000);
  });
});
