import { Mastra } from "@mastra/core";
import { createLogger } from "@/lib/logger";
import { getBalancedCerebrasProviderSync } from "./cerebras-key-balancer";

const logger = createLogger("ai/mastra-config");

/**
 * Mastra Configuration
 *
 * This module provides the centralized Mastra instance configuration
 * for multi-agent workflows. The application uses Mastra's dual-agent
 * workflow by default, with the Cerebras provider for load balancing.
 */

/**
 * Create a Mastra instance with Cerebras provider
 *
 * This function creates a new Mastra instance configured with:
 * - Cerebras provider with load balancing
 * - Streaming support enabled
 *
 * @returns Configured Mastra instance
 */
export function createMastraInstance() {
  // Verify Cerebras provider is available
  try {
    getBalancedCerebrasProviderSync();
    logger.log("[Mastra Config] Cerebras provider initialized successfully");
  } catch (error) {
    logger.error(
      "[Mastra Config] Failed to initialize Cerebras provider:",
      error
    );
  }

  logger.log("[Mastra Config] Initializing Mastra instance");

  // Create Mastra instance
  const mastraInstance = new Mastra({});

  return mastraInstance;
}

/**
 * Shared Mastra instance
 * This is the main instance used throughout the application
 */
export const mastra = createMastraInstance();
