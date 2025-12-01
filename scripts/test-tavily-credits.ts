/**
 * Test Tavily Credit Tracking
 * Run with: npx tsx scripts/test-tavily-credits.ts
 */

import { resolve } from "node:path";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import { getTavilyBalancer } from "../lib/ai/tavily-key-balancer";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function testCreditTracking() {
  console.log("🧪 Testing Tavily Credit Tracking\n");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const COST = 5;
  console.log(`   Requesting key with cost: ${COST}...`);

  try {
    // We need to capture the console log to get the key ID,
    // or we can just check all keys and see which one changed.
    // But TavilyKeyBalancer logs to stdout, so we can see it.

    const apiKey = await getTavilyBalancer().getApiKey(COST);

    if (!apiKey) {
      console.error("   ❌ Failed to get API key");
      return;
    }

    console.log("   ✅ Got API key");

    // We can't easily know WHICH key was selected without parsing logs or modifying the balancer to return ID.
    // For verification, let's just list all keys and their credits.

    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    console.log(`   Checking Redis for usage (Month: ${monthKey})...`);

    // Scan for credit keys
    const keys = await redis.keys(`tavily:key:credits:*:${monthKey}`);

    if (keys.length === 0) {
      console.log("   ⚠️ No credit usage keys found yet.");
    } else {
      for (const key of keys) {
        const usage = await redis.get(key);
        console.log(`   - ${key}: ${usage}`);
      }
    }
  } catch (error: any) {
    console.error("   ❌ Error:", error.message);
  }
}

testCreditTracking();
