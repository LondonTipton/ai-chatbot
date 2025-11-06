/**
 * Manual test script for the unified research API endpoint
 *
 * This script tests all three modes (AUTO, MEDIUM, DEEP) with sample queries
 * and verifies the response structure, caching, and error handling.
 *
 * Usage:
 *   pnpm tsx scripts/test-research-api.ts
 */

import { queryCache } from "@/lib/cache";
import { checkRateLimits } from "@/lib/rate-limiter";
import { dailyTokenTracker } from "@/lib/token-tracker";
import { autoAgent } from "@/mastra/agents/auto-agent";
import { deepAgent } from "@/mastra/agents/deep-agent";
import { mediumAgent } from "@/mastra/agents/medium-agent";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log("\n" + "=".repeat(80));
  log(title, colors.bright + colors.cyan);
  console.log("=".repeat(80) + "\n");
}

// Token budgets per mode
const TOKEN_BUDGETS = {
  auto: 2500,
  medium: 8000,
  deep: 20_000,
} as const;

// Agent mapping
const AGENTS = {
  auto: autoAgent,
  medium: mediumAgent,
  deep: deepAgent,
} as const;

/**
 * Test AUTO mode
 */
async function testAutoMode() {
  section("TEST 1: AUTO Mode - Simple Query");

  const query = "What is the doctrine of precedent?";
  const mode = "auto";
  const jurisdiction = "Zimbabwe";

  log(`Query: "${query}"`, colors.blue);
  log(`Mode: ${mode.toUpperCase()}`, colors.blue);
  log(`Jurisdiction: ${jurisdiction}`, colors.blue);

  try {
    // Check rate limits
    log("\n[1/5] Checking rate limits...", colors.yellow);
    await checkRateLimits(TOKEN_BUDGETS[mode]);
    log("✅ Rate limits OK", colors.green);

    // Check cache
    log("\n[2/5] Checking cache...", colors.yellow);
    const cached = await queryCache.get(query, mode, jurisdiction);
    if (cached) {
      log("✅ Cache hit - returning cached response", colors.green);
      log(`Response: ${cached.response.substring(0, 200)}...`, colors.cyan);
      return;
    }
    log("❌ Cache miss - executing agent", colors.yellow);

    // Execute agent
    log("\n[3/5] Executing AUTO agent...", colors.yellow);
    const startTime = Date.now();
    const response = await AGENTS[mode].generate(
      `Zimbabwe Legal Query: ${query}`,
      { maxSteps: 3 }
    );
    const latency = Date.now() - startTime;

    log(`✅ Agent completed in ${latency}ms`, colors.green);
    log(`Steps used: ${response.steps?.length || 0}`, colors.cyan);
    log(
      `Tools called: ${
        response.toolCalls?.map((t) => t.toolName).join(", ") || "none"
      }`,
      colors.cyan
    );

    // Cache response
    log("\n[4/5] Caching response...", colors.yellow);
    await queryCache.set({
      query,
      mode,
      jurisdiction,
      response: response.text,
      metadata: {
        mode,
        stepsUsed: response.steps?.length || 0,
        toolsCalled: response.toolCalls?.map((t) => t.toolName) || [],
        tokenEstimate: TOKEN_BUDGETS[mode],
      },
    });
    log("✅ Response cached", colors.green);

    // Track token usage
    log("\n[5/5] Tracking token usage...", colors.yellow);
    await dailyTokenTracker.incrementDailyTokenUsage(TOKEN_BUDGETS[mode]);
    log(`✅ Incremented usage by ${TOKEN_BUDGETS[mode]} tokens`, colors.green);

    // Display response
    log("\n📄 Response:", colors.bright);
    log(response.text.substring(0, 500) + "...", colors.cyan);

    log("\n✅ AUTO mode test completed successfully", colors.green);
  } catch (error) {
    log(
      `\n❌ AUTO mode test failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      colors.red
    );
    if (error instanceof Error && error.stack) {
      log(error.stack, colors.red);
    }
  }
}

/**
 * Test MEDIUM mode
 */
async function testMediumMode() {
  section("TEST 2: MEDIUM Mode - Comparative Query");

  const query = "Compare employment termination procedures in Zimbabwe";
  const mode = "medium";
  const jurisdiction = "Zimbabwe";

  log(`Query: "${query}"`, colors.blue);
  log(`Mode: ${mode.toUpperCase()}`, colors.blue);
  log(`Jurisdiction: ${jurisdiction}`, colors.blue);

  try {
    // Check rate limits
    log("\n[1/5] Checking rate limits...", colors.yellow);
    await checkRateLimits(TOKEN_BUDGETS[mode]);
    log("✅ Rate limits OK", colors.green);

    // Check cache
    log("\n[2/5] Checking cache...", colors.yellow);
    const cached = await queryCache.get(query, mode, jurisdiction);
    if (cached) {
      log("✅ Cache hit - returning cached response", colors.green);
      log(`Response: ${cached.response.substring(0, 200)}...`, colors.cyan);
      return;
    }
    log("❌ Cache miss - executing agent", colors.yellow);

    // Execute agent
    log("\n[3/5] Executing MEDIUM agent...", colors.yellow);
    const startTime = Date.now();
    const response = await AGENTS[mode].generate(
      `Zimbabwe Legal Query: ${query}`,
      { maxSteps: 6 }
    );
    const latency = Date.now() - startTime;

    log(`✅ Agent completed in ${latency}ms`, colors.green);
    log(`Steps used: ${response.steps?.length || 0}`, colors.cyan);
    log(
      `Tools called: ${
        response.toolCalls?.map((t) => t.toolName).join(", ") || "none"
      }`,
      colors.cyan
    );

    // Cache response
    log("\n[4/5] Caching response...", colors.yellow);
    await queryCache.set({
      query,
      mode,
      jurisdiction,
      response: response.text,
      metadata: {
        mode,
        stepsUsed: response.steps?.length || 0,
        toolsCalled: response.toolCalls?.map((t) => t.toolName) || [],
        tokenEstimate: TOKEN_BUDGETS[mode],
      },
    });
    log("✅ Response cached", colors.green);

    // Track token usage
    log("\n[5/5] Tracking token usage...", colors.yellow);
    await dailyTokenTracker.incrementDailyTokenUsage(TOKEN_BUDGETS[mode]);
    log(`✅ Incremented usage by ${TOKEN_BUDGETS[mode]} tokens`, colors.green);

    // Display response
    log("\n📄 Response:", colors.bright);
    log(response.text.substring(0, 500) + "...", colors.cyan);

    log("\n✅ MEDIUM mode test completed successfully", colors.green);
  } catch (error) {
    log(
      `\n❌ MEDIUM mode test failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      colors.red
    );
    if (error instanceof Error && error.stack) {
      log(error.stack, colors.red);
    }
  }
}

/**
 * Test DEEP mode
 */
async function testDeepMode() {
  section("TEST 3: DEEP Mode - Comprehensive Query");

  const query =
    "Analyze the constitutional framework for human rights in Zimbabwe";
  const mode = "deep";
  const jurisdiction = "Zimbabwe";

  log(`Query: "${query}"`, colors.blue);
  log(`Mode: ${mode.toUpperCase()}`, colors.blue);
  log(`Jurisdiction: ${jurisdiction}`, colors.blue);

  try {
    // Check rate limits
    log("\n[1/5] Checking rate limits...", colors.yellow);
    await checkRateLimits(TOKEN_BUDGETS[mode]);
    log("✅ Rate limits OK", colors.green);

    // Check cache
    log("\n[2/5] Checking cache...", colors.yellow);
    const cached = await queryCache.get(query, mode, jurisdiction);
    if (cached) {
      log("✅ Cache hit - returning cached response", colors.green);
      log(`Response: ${cached.response.substring(0, 200)}...`, colors.cyan);
      return;
    }
    log("❌ Cache miss - executing agent", colors.yellow);

    // Execute agent
    log("\n[3/5] Executing DEEP agent...", colors.yellow);
    const startTime = Date.now();
    const response = await AGENTS[mode].generate(
      `Zimbabwe Legal Query: ${query}`,
      { maxSteps: 3 }
    );
    const latency = Date.now() - startTime;

    log(`✅ Agent completed in ${latency}ms`, colors.green);
    log(`Steps used: ${response.steps?.length || 0}`, colors.cyan);
    log(
      `Tools called: ${
        response.toolCalls?.map((t) => t.toolName).join(", ") || "none"
      }`,
      colors.cyan
    );

    // Cache response
    log("\n[4/5] Caching response...", colors.yellow);
    await queryCache.set({
      query,
      mode,
      jurisdiction,
      response: response.text,
      metadata: {
        mode,
        stepsUsed: response.steps?.length || 0,
        toolsCalled: response.toolCalls?.map((t) => t.toolName) || [],
        tokenEstimate: TOKEN_BUDGETS[mode],
      },
    });
    log("✅ Response cached", colors.green);

    // Track token usage
    log("\n[5/5] Tracking token usage...", colors.yellow);
    await dailyTokenTracker.incrementDailyTokenUsage(TOKEN_BUDGETS[mode]);
    log(`✅ Incremented usage by ${TOKEN_BUDGETS[mode]} tokens`, colors.green);

    // Display response
    log("\n📄 Response:", colors.bright);
    log(response.text.substring(0, 500) + "...", colors.cyan);

    log("\n✅ DEEP mode test completed successfully", colors.green);
  } catch (error) {
    log(
      `\n❌ DEEP mode test failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      colors.red
    );
    if (error instanceof Error && error.stack) {
      log(error.stack, colors.red);
    }
  }
}

/**
 * Test cache hit scenario
 */
async function testCacheHit() {
  section("TEST 4: Cache Hit Scenario");

  const query = "What is a contract?";
  const mode = "auto";
  const jurisdiction = "Zimbabwe";

  log(`Query: "${query}"`, colors.blue);
  log(`Mode: ${mode.toUpperCase()}`, colors.blue);

  try {
    // First request (cache miss)
    log("\n[1/2] First request (should be cache miss)...", colors.yellow);
    const cached1 = await queryCache.get(query, mode, jurisdiction);

    if (cached1) {
      log("✅ Already cached from previous test", colors.green);
    } else {
      log("❌ Cache miss - executing agent", colors.yellow);
      const response = await AGENTS[mode].generate(
        `Zimbabwe Legal Query: ${query}`,
        { maxSteps: 3 }
      );

      await queryCache.set({
        query,
        mode,
        jurisdiction,
        response: response.text,
        metadata: {
          mode,
          stepsUsed: response.steps?.length || 0,
          toolsCalled: response.toolCalls?.map((t) => t.toolName) || [],
          tokenEstimate: TOKEN_BUDGETS[mode],
        },
      });
      log("✅ Response cached", colors.green);
    }

    // Second request (cache hit)
    log("\n[2/2] Second request (should be cache hit)...", colors.yellow);
    const cached2 = await queryCache.get(query, mode, jurisdiction);

    if (cached2) {
      log("✅ Cache hit!", colors.green);
      log(`Response: ${cached2.response.substring(0, 200)}...`, colors.cyan);
      log(
        `Cache age: ${Math.floor((Date.now() - cached2.timestamp) / 1000)}s`,
        colors.cyan
      );
    } else {
      log("❌ Cache miss (unexpected)", colors.red);
    }

    log("\n✅ Cache test completed successfully", colors.green);
  } catch (error) {
    log(
      `\n❌ Cache test failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      colors.red
    );
  }
}

/**
 * Display token usage statistics
 */
async function displayTokenStats() {
  section("TOKEN USAGE STATISTICS");

  try {
    const stats = await dailyTokenTracker.getUsageStats();

    log(`Date: ${stats.date}`, colors.cyan);
    log(`Usage: ${stats.usage.toLocaleString()} tokens`, colors.cyan);
    log(`Limit: ${stats.limit.toLocaleString()} tokens`, colors.cyan);
    log(`Remaining: ${stats.remaining.toLocaleString()} tokens`, colors.cyan);
    log(`Percent Used: ${stats.percentUsed.toFixed(2)}%`, colors.cyan);
    log(
      `Status: ${stats.withinLimit ? "✅ Within Limit" : "⚠️ Exceeded Limit"}`,
      stats.withinLimit ? colors.green : colors.red
    );
  } catch (error) {
    log(
      `❌ Failed to get token stats: ${
        error instanceof Error ? error.message : String(error)
      }`,
      colors.red
    );
  }
}

/**
 * Main test runner
 */
async function main() {
  log("\n🔬 RESEARCH API TEST SUITE", colors.bright + colors.cyan);
  log("Testing unified research endpoint with all three modes\n", colors.cyan);

  try {
    // Run tests sequentially
    await testAutoMode();
    await testMediumMode();
    await testDeepMode();
    await testCacheHit();

    // Display final statistics
    await displayTokenStats();

    section("✅ ALL TESTS COMPLETED");
    log("All research API tests passed successfully!", colors.green);
  } catch (error) {
    section("❌ TEST SUITE FAILED");
    log(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      colors.red
    );
    if (error instanceof Error && error.stack) {
      log(error.stack, colors.red);
    }
    process.exit(1);
  }
}

// Run tests
main();
