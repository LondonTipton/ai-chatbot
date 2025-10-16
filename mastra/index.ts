import { Mastra } from "@mastra/core";
import { legalAgent } from "./agents/legal-agent";

/**
 * Main Mastra instance configuration
 * This is the central orchestrator for all AI agents and workflows
 */
export const mastra = new Mastra({
  agents: {
    legalAgent,
  },
});
