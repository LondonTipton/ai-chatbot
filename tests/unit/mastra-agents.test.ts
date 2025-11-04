/**
 * Unit tests for Mastra agents
 *
 * Tests individual agents in isolation to verify they are properly configured
 * and can execute basic operations.
 */

import { expect, test } from "@playwright/test";
import { analyzeAgent } from "@/lib/ai/agents/analyze-agent";
import { caseSearchAgent } from "@/lib/ai/agents/case-search-agent";
import { compareAgent } from "@/lib/ai/agents/compare-agent";
import { draftAgent } from "@/lib/ai/agents/draft-agent";
import { extractAgent } from "@/lib/ai/agents/extract-agent";
import { holdingsAgent } from "@/lib/ai/agents/holdings-agent";
import { issuesAgent } from "@/lib/ai/agents/issues-agent";
import { mediumResearchAgent } from "@/lib/ai/agents/medium-research";
import { recommendationsAgent } from "@/lib/ai/agents/recommendations-agent";
import { refineAgent } from "@/lib/ai/agents/refine-agent";
import { researchAgent } from "@/lib/ai/agents/research-agent";
import { searchAgent } from "@/lib/ai/agents/search-agent";
import { structureAgent } from "@/lib/ai/agents/structure-agent";

test.describe("Mastra Agents Configuration", () => {
  test.describe("Medium Research Agent", () => {
    test("should be properly configured", () => {
      expect(mediumResearchAgent).toBeDefined();
      expect(mediumResearchAgent.name).toBe("medium-research");
    });

    test("should have instructions", () => {
      expect(mediumResearchAgent.instructions).toBeDefined();
      expect(typeof mediumResearchAgent.instructions).toBe("string");
      expect(mediumResearchAgent.instructions.length).toBeGreaterThan(0);
    });

    test("should have model configured", () => {
      expect(mediumResearchAgent.model).toBeDefined();
    });

    test("should have tools configured", () => {
      expect(mediumResearchAgent.tools).toBeDefined();
      expect(Object.keys(mediumResearchAgent.tools).length).toBeGreaterThan(0);
    });
  });

  test.describe("Deep Research Workflow Agents", () => {
    test("search agent should be properly configured", () => {
      expect(searchAgent).toBeDefined();
      expect(searchAgent.name).toBe("search-agent");
      expect(searchAgent.instructions).toBeDefined();
      expect(searchAgent.model).toBeDefined();
      expect(searchAgent.tools).toBeDefined();
    });

    test("extract agent should be properly configured", () => {
      expect(extractAgent).toBeDefined();
      expect(extractAgent.name).toBe("extract-agent");
      expect(extractAgent.instructions).toBeDefined();
      expect(extractAgent.model).toBeDefined();
      expect(extractAgent.tools).toBeDefined();
    });

    test("analyze agent should be properly configured", () => {
      expect(analyzeAgent).toBeDefined();
      expect(analyzeAgent.name).toBe("analyze-agent");
      expect(analyzeAgent.instructions).toBeDefined();
      expect(analyzeAgent.model).toBeDefined();
      expect(analyzeAgent.tools).toBeDefined();
    });
  });

  test.describe("Document Review Workflow Agents", () => {
    test("structure agent should be properly configured", () => {
      expect(structureAgent).toBeDefined();
      expect(structureAgent.name).toBe("structure-agent");
      expect(structureAgent.instructions).toBeDefined();
      expect(structureAgent.model).toBeDefined();
      expect(structureAgent.tools).toBeDefined();
    });

    test("issues agent should be properly configured", () => {
      expect(issuesAgent).toBeDefined();
      expect(issuesAgent.name).toBe("issues-agent");
      expect(issuesAgent.instructions).toBeDefined();
      expect(issuesAgent.model).toBeDefined();
      expect(issuesAgent.tools).toBeDefined();
    });

    test("recommendations agent should be properly configured", () => {
      expect(recommendationsAgent).toBeDefined();
      expect(recommendationsAgent.name).toBe("recommendations-agent");
      expect(recommendationsAgent.instructions).toBeDefined();
      expect(recommendationsAgent.model).toBeDefined();
      expect(recommendationsAgent.tools).toBeDefined();
    });
  });

  test.describe("Case Law Analysis Workflow Agents", () => {
    test("case search agent should be properly configured", () => {
      expect(caseSearchAgent).toBeDefined();
      expect(caseSearchAgent.name).toBe("case-search-agent");
      expect(caseSearchAgent.instructions).toBeDefined();
      expect(caseSearchAgent.model).toBeDefined();
      expect(caseSearchAgent.tools).toBeDefined();
    });

    test("holdings agent should be properly configured", () => {
      expect(holdingsAgent).toBeDefined();
      expect(holdingsAgent.name).toBe("holdings-agent");
      expect(holdingsAgent.instructions).toBeDefined();
      expect(holdingsAgent.model).toBeDefined();
      expect(holdingsAgent.tools).toBeDefined();
    });

    test("compare agent should be properly configured", () => {
      expect(compareAgent).toBeDefined();
      expect(compareAgent.name).toBe("compare-agent");
      expect(compareAgent.instructions).toBeDefined();
      expect(compareAgent.model).toBeDefined();
      expect(compareAgent.tools).toBeDefined();
    });
  });

  test.describe("Legal Drafting Workflow Agents", () => {
    test("research agent should be properly configured", () => {
      expect(researchAgent).toBeDefined();
      expect(researchAgent.name).toBe("research-agent");
      expect(researchAgent.instructions).toBeDefined();
      expect(researchAgent.model).toBeDefined();
      expect(researchAgent.tools).toBeDefined();
    });

    test("draft agent should be properly configured", () => {
      expect(draftAgent).toBeDefined();
      expect(draftAgent.name).toBe("draft-agent");
      expect(draftAgent.instructions).toBeDefined();
      expect(draftAgent.model).toBeDefined();
      expect(draftAgent.tools).toBeDefined();
    });

    test("refine agent should be properly configured", () => {
      expect(refineAgent).toBeDefined();
      expect(refineAgent.name).toBe("refine-agent");
      expect(refineAgent.instructions).toBeDefined();
      expect(refineAgent.model).toBeDefined();
      expect(refineAgent.tools).toBeDefined();
    });
  });

  test.describe("Agent Tool Access", () => {
    test("all agents should have access to all tools", () => {
      const agents = [
        mediumResearchAgent,
        searchAgent,
        extractAgent,
        analyzeAgent,
        structureAgent,
        issuesAgent,
        recommendationsAgent,
        caseSearchAgent,
        holdingsAgent,
        compareAgent,
        researchAgent,
        draftAgent,
        refineAgent,
      ];

      const requiredTools = [
        "tavilySearch",
        "tavilySearchAdvanced",
        "tavilyQna",
        "tavilyExtract",
        "createDocument",
        "updateDocument",
        "requestSuggestions",
        "summarizeContent",
        "getWeather",
      ];

      for (const agent of agents) {
        const agentTools = Object.keys(agent.tools);

        for (const toolName of requiredTools) {
          expect(agentTools).toContain(toolName);
        }
      }
    });
  });
});
