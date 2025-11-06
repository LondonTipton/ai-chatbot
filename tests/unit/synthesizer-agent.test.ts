/**
 * Unit tests for Synthesizer Agent
 *
 * Tests the synthesizer agent configuration:
 * - Proper configuration (temperature, maxTokens, no tools)
 * - Instructions emphasize formatting and citation preservation
 * - Agent is ready for use in workflows
 *
 * Requirements: 6.1, 6.2, 6.3
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
const TOOLS_REGEX = /tools:\s*\{\s*\}/;

test.describe("Synthesizer Agent Configuration", () => {
  let agentCode: string;

  test.beforeAll(() => {
    // Read the agent file to verify configuration
    const agentPath = join(
      process.cwd(),
      "mastra",
      "agents",
      "synthesizer-agent.ts"
    );
    agentCode = readFileSync(agentPath, "utf-8");
  });

  test("should have correct agent name", () => {
    expect(agentCode).toContain('name: "synthesizer-agent"');
  });

  test("should document temperature 0.6 in comments", () => {
    expect(agentCode).toContain("Temperature: 0.6");
  });

  test("should document maxTokens 6000 in comments", () => {
    expect(agentCode).toContain("Max Tokens: 6000");
  });

  test("should show usage example with maxSteps", () => {
    expect(agentCode).toContain("maxSteps: 1");
  });

  test("should have no tools configured", () => {
    // Should have empty tools object
    expect(agentCode).toMatch(TOOLS_REGEX);
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
      expect(instructionsMatch[1].length).toBeGreaterThan(500);
    }
  });

  test("should emphasize citation preservation in instructions", () => {
    expect(agentCode).toContain("CITATION");
    expect(agentCode).toContain("preserve");
    expect(agentCode).toContain("Sources");
    expect(agentCode).toContain("citations");
  });

  test("should emphasize markdown formatting in instructions", () => {
    expect(agentCode).toContain("markdown");
    expect(agentCode).toContain("FORMATTING");
    expect(agentCode).toContain("formatting");
  });

  test("should mention Zimbabwe legal context", () => {
    expect(agentCode).toContain("Zimbabwe");
  });

  test("should specify formatting-only role", () => {
    expect(agentCode).toContain("formatting only");
    expect(agentCode).toContain("Do NOT use tools");
  });

  test("should have clear content structure guidelines", () => {
    expect(agentCode).toContain("CONTENT STRUCTURE");
    expect(agentCode).toContain("summary");
    expect(agentCode).toContain("sections");
  });

  test("should specify writing style requirements", () => {
    expect(agentCode).toContain("WRITING STYLE");
    expect(agentCode).toContain("Professional");
    expect(agentCode).toContain("Clear");
  });

  test("should have critical rules section", () => {
    expect(agentCode).toContain("CRITICAL RULES");
    expect(agentCode).toContain("self-contained");
    expect(agentCode).toContain("complete");
  });

  test("should reference requirements in comments", () => {
    expect(agentCode).toContain("Requirements: 6.1, 6.2, 6.3");
  });

  test("should document usage in workflows", () => {
    expect(agentCode).toContain("basicSearch");
    expect(agentCode).toContain("advancedSearch");
    expect(agentCode).toContain("comprehensiveAnalysis");
  });
});
