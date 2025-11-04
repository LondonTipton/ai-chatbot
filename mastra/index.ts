import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core";
import { analysisAgent } from "./agents/analysis-agent";
import { extractAgent } from "./agents/extract-agent";
import { legalAgent } from "./agents/legal-agent";
import { mediumResearchAgent } from "./agents/medium-research-agent";
import { searchAgent } from "./agents/search-agent";

/**
 * Main Mastra instance configuration
 * This is the central orchestrator for all AI agents and workflows
 *
 * Uses official @mastra/ai-sdk for AI SDK v5 compatibility
 */
export const mastra = new Mastra({
  agents: {
    legalAgent: legalAgent as any,
    mediumResearchAgent: mediumResearchAgent as any,
    searchAgent: searchAgent as any,
    extractAgent: extractAgent as any,
    analysisAgent: analysisAgent as any,
  },
  server: {
    apiRoutes: [
      // Legal agent route for simple/light queries
      chatRoute({
        path: "/chat/legal",
        agent: "legalAgent",
      }),
      // Medium research agent route for medium complexity queries
      chatRoute({
        path: "/chat/research",
        agent: "mediumResearchAgent",
      }),
      // Search agent route for deep research workflows
      chatRoute({
        path: "/chat/search",
        agent: "searchAgent",
      }),
    ],
  },
});
