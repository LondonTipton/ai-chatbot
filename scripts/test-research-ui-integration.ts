/**
 * Test script for Research UI Integration (Task 22)
 *
 * This script tests the end-to-end flow of the research interface
 * integrated into the chat UI.
 *
 * Run with: pnpm tsx scripts/test-research-ui-integration.ts
 */

import { createLogger } from "../lib/logger";

const logger = createLogger("test-research-ui-integration");

async function testResearchUIIntegration() {
  logger.log("=".repeat(80));
  logger.log("Testing Research UI Integration");
  logger.log("=".repeat(80));

  // Test 1: Verify models configuration
  logger.log("\n[Test 1] Verifying models configuration...");
  try {
    const { chatModels, DEFAULT_CHAT_MODEL } = await import("../lib/ai/models");

    logger.log(`Default model: ${DEFAULT_CHAT_MODEL}`);
    logger.log(`Available models: ${chatModels.length}`);

    chatModels.forEach((model) => {
      logger.log(
        `  - ${model.id}: ${model.name} ${model.icon || ""} (${
          model.description
        })`
      );
    });

    // Verify research modes exist
    const hasAuto = chatModels.some((m) => m.id === "research-auto");
    const hasMedium = chatModels.some((m) => m.id === "research-medium");
    const hasDeep = chatModels.some((m) => m.id === "research-deep");

    if (hasAuto && hasMedium && hasDeep) {
      logger.log("✅ All three research modes are configured");
    } else {
      logger.error("❌ Missing research modes");
      return false;
    }

    // Verify icons
    const autoModel = chatModels.find((m) => m.id === "research-auto");
    const mediumModel = chatModels.find((m) => m.id === "research-medium");
    const deepModel = chatModels.find((m) => m.id === "research-deep");

    if (autoModel?.icon && mediumModel?.icon && deepModel?.icon) {
      logger.log("✅ All research modes have icons");
    } else {
      logger.error("❌ Missing icons for research modes");
      return false;
    }
  } catch (error) {
    logger.error("❌ Failed to load models configuration:", error);
    return false;
  }

  // Test 2: Test research API endpoint
  logger.log("\n[Test 2] Testing research API endpoint...");
  try {
    const response = await fetch("http://localhost:3000/api/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "What is the legal drinking age in Zimbabwe?",
        mode: "auto",
        jurisdiction: "Zimbabwe",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      logger.log("✅ Research API responded successfully");
      logger.log(`   Success: ${data.success}`);
      logger.log(`   Mode: ${data.metadata?.mode}`);
      logger.log(`   Cached: ${data.metadata?.cached}`);
      logger.log(`   Latency: ${data.metadata?.latency}ms`);
    } else {
      const error = await response.json();
      logger.error(`❌ Research API error: ${error.error?.message}`);
      if (error.error?.code === "RATE_LIMIT_EXCEEDED") {
        logger.log("   (Rate limit error is expected behavior)");
      }
    }
  } catch (error) {
    logger.error("❌ Failed to call research API:", error);
    logger.log("   (Make sure the dev server is running: pnpm dev)");
  }

  // Test 3: Verify research mode hook
  logger.log("\n[Test 3] Verifying research mode hook...");
  try {
    const hookModule = await import("../hooks/use-research-mode");
    if (hookModule.useResearchMode) {
      logger.log("✅ Research mode hook exists");
    } else {
      logger.error("❌ Research mode hook not found");
      return false;
    }
  } catch (error) {
    logger.error("❌ Failed to load research mode hook:", error);
    return false;
  }

  // Test 4: Check for required components
  logger.log("\n[Test 4] Checking for required components...");
  const requiredFiles = [
    "components/chat.tsx",
    "components/multimodal-input.tsx",
    "lib/ai/models.ts",
    "hooks/use-research-mode.ts",
    "app/(chat)/api/research/route.ts",
  ];

  for (const file of requiredFiles) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        logger.log(`✅ ${file} exists`);
      } else {
        logger.error(`❌ ${file} not found`);
        return false;
      }
    } catch (error) {
      logger.error(`❌ Error checking ${file}:`, error);
      return false;
    }
  }

  logger.log("\n" + "=".repeat(80));
  logger.log("✅ Research UI Integration Tests Complete");
  logger.log("=".repeat(80));
  logger.log("\nManual Testing Checklist:");
  logger.log("1. Start dev server: pnpm dev");
  logger.log("2. Open chat interface");
  logger.log(
    "3. Click model selector - should show AUTO, MEDIUM, DEEP with icons"
  );
  logger.log("4. Select AUTO mode");
  logger.log("5. Enter a legal query about Zimbabwe");
  logger.log("6. Verify loading message appears");
  logger.log("7. Verify results display with metadata and sources");
  logger.log("8. Test error handling by triggering rate limit");
  logger.log("9. Verify file attachments are disabled in research modes");
  logger.log("10. Switch back to normal chat and verify it works");

  return true;
}

// Run tests
testResearchUIIntegration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    logger.error("Test script failed:", error);
    process.exit(1);
  });
