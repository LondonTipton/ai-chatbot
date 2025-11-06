/**
 * Unit tests for Analysis Agent
 *
 * Tests the analysis agent configuration:
 * - Proper configuration (temperature 0.5, maxTokens 10000, summarize tool)
 * - Instructions emphasize comprehensive analysis and Zimbabwe legal context
 * - Citation handling requirements
 * - Agent is ready for use in workflows
 *
 * Requirements: 6.3
 *
 * Note: This test focuses on configuration validation.
 * Integration tests with actual API calls should be done separately
 * to avoid rate limits and ensure fast unit test execution.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// Regex patterns defined at module level for performance
const INSTRUCTIONS_REGEX = /instructions:\s*`([^`]+)`/s;
const TOOLS_REGEX = /tools:\s*\{/;

test.describe("Analysis Agent Configuration", () => {
  let agentCode: string;

  test.beforeAll(() => {
    // Read the agent file to verify configuration
    const agentPath = join(
      process.cwd(),
      "mastra",
      "agents",
      "analysis-agent.ts"
    );
    agentCode = readFileSync(agentPath, "utf-8");
  });

  test("should have correct agent name", () => {
    expect(agentCode).toContain('name: "analysis-agent"');
  });

  test("should document temperature 0.5 in comments", () => {
    expect(agentCode).toContain("Temperature: 0.5");
  });

  test("should document maxTokens 10000 in comments", () => {
    expect(agentCode).toContain("Max Tokens: 10000");
  });

  test("should have summarize tool configured", () => {
    // Should have summarize tool in tools object
    expect(agentCode).toMatch(TOOLS_REGEX);
    expect(agentCode).toContain("summarize:");
    expect(agentCode).toContain("tavilySummarizeTool");
  });

  test("should use llama-3.3-70b model", () => {
    expect(agentCode).toContain('cerebrasProvider("llama-3.3-70b")');
  });

  test("should have comprehensive instructions", () => {
    expect(agentCode).toContain("instructions:");
    // Instructions should be substantial
    const instructionsMatch = agentCode.match(INSTRUCTIONS_REGEX);
    expect(instructionsMatch).toBeTruthy();
    if (instructionsMatch) {
      expect(instructionsMatch[1].length).toBeGreaterThan(1000);
    }
  });

  test("should emphasize comprehensive analysis in instructions", () => {
    expect(agentCode).toContain("ANALYSIS REQUIREMENTS");
    expect(agentCode).toContain("comprehensive");
    expect(agentCode).toContain("analysis");
    expect(agentCode).toContain("legal implications");
  });

  test("should emphasize Zimbabwe legal context", () => {
    expect(agentCode).toContain("ZIMBABWE LEGAL CONTEXT");
    expect(agentCode).toContain("Zimbabwe");
    expect(agentCode).toContain("Constitution of Zimbabwe");
    expect(agentCode).toContain("Roman-Dutch");
  });

  test("should have citation requirements", () => {
    expect(agentCode).toContain("CITATION REQUIREMENTS");
    expect(agentCode).toContain("preserve");
    expect(agentCode).toContain("citations");
    expect(agentCode).toContain("sources");
  });

  test("should specify content structure", () => {
    expect(agentCode).toContain("CONTENT STRUCTURE");
    expect(agentCode).toContain("Executive Summary");
    expect(agentCode).toContain("Legal Framework");
    expect(agentCode).toContain("Analysis");
    expect(agentCode).toContain("Case Law");
    expect(agentCode).toContain("Practical Implications");
  });

  test("should specify writing style requirements", () => {
    expect(agentCode).toContain("WRITING STYLE");
    expect(agentCode).toContain("Professional");
    expect(agentCode).toContain("legal writing");
    expect(agentCode).toContain("analytical");
  });

  test("should document tool usage guidelines", () => {
    expect(agentCode).toContain("TOOL USAGE");
    expect(agentCode).toContain("summarize");
    expect(agentCode).toContain("long content");
  });

  test("should have critical rules section", () => {
    expect(agentCode).toContain("CRITICAL RULES");
    expect(agentCode).toContain("publication-quality");
    expect(agentCode).toContain("Zimbabwe legal context");
  });

  test("should have quality standards section", () => {
    expect(agentCode).toContain("QUALITY STANDARDS");
    expect(agentCode).toContain("professional legal use");
    expect(agentCode).toContain("accurate");
  });

  test("should reference requirements in comments", () => {
    expect(agentCode).toContain("Requirements: 6.3");
  });

  test("should document usage in workflows", () => {
    expect(agentCode).toContain("comprehensiveAnalysis");
  });

  test("should show usage example with maxSteps", () => {
    expect(agentCode).toContain("maxSteps:");
  });

  test("should import summarize tool", () => {
    expect(agentCode).toContain(
      'import { tavilySummarizeTool } from "../tools/tavily-summarize"'
    );
  });

  test("should use balanced Cerebras provider", () => {
    expect(agentCode).toContain("getBalancedCerebrasProvider");
    expect(agentCode).toContain("cerebrasProvider");
  });
});
