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
 * Note: Workflows removed temporarily - Mastra 0.20.2 doesn't support Step/Workflow pattern
 * Deep research and document review will use sequential agent calls instead
 */
export const mastra = new Mastra({
  agents: {
    legalAgent,
    mediumResearchAgent,
    searchAgent,
    extractAgent,
    analysisAgent,
  },
});
