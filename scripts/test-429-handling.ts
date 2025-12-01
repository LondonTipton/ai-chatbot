/**
 * Test Advanced 429 Error Handling
 * Run with: npx tsx scripts/test-429-handling.ts
 */

import { resolve } from "node:path";
import dotenv from "dotenv";
import { getCerebrasBalancer } from "../lib/ai/cerebras-key-balancer";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

console.log("🧪 Testing Advanced 429 Error Handling\n");

async function testErrorClassification() {
  console.log("1️⃣ Testing Error Classification\n");

  const balancer = getCerebrasBalancer();

  // Test rate limit error
  const rateLimitError = {
    statusCode: 429,
    message: "Rate limit exceeded. Please retry after 60s.",
  };

  console.log("   Testing rate limit error...");
  const rateLimitResult = await balancer.handleError(rateLimitError);
  console.log("   Result:", rateLimitResult);
  console.log(
    "   ✅ Expected: shouldRotateKey=true, shouldRetry=true, waitTime=0"
  );
  console.log("");

  // Test queue overflow error
  const queueError = {
    message: "Queue exceeded, please retry in 60s",
    data: { param: "queue", code: "queue_exceeded" },
  };

  console.log("   Testing queue overflow error...");
  const queueResult = await balancer.handleError(queueError);
  console.log("   Result:", queueResult);
  console.log(
    "   ✅ Expected: shouldRotateKey=true, shouldRetry=true, waitTime=0"
  );
  console.log("   ℹ️  Note: Key will be disabled for 15 seconds in Redis");
  console.log("");

  // Test other error
  const otherError = {
    message: "Invalid authentication",
    statusCode: 401,
  };

  console.log("   Testing other error...");
  const otherResult = await balancer.handleError(otherError);
  console.log("   Result:", otherResult);
  console.log(
    "   ✅ Expected: shouldRotateKey=false, shouldRetry=true, waitTime=2"
  );
  console.log("");
}

async function testKeyRetrieval() {
  console.log("2️⃣ Testing Key Retrieval\n");

  const balancer = getCerebrasBalancer();

  try {
    console.log("   Requesting key from load balancer...");
    const provider = await balancer.getProvider();
    console.log("   ✅ Successfully retrieved provider");
  } catch (error: any) {
    console.error("   ❌ Failed to retrieve key:", error.message);
  }

  console.log("");
}

async function main() {
  await testErrorClassification();
  await testKeyRetrieval();

  console.log("✨ Testing Complete!\n");
}

main();
