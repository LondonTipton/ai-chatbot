import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import { Client, Functions } from "node-appwrite";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function verifyAppwriteFunctionLogic() {
  console.log("🧪 Verifying Appwrite Function Logic...");
  console.log("-------------------------------------");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID_LOAD_BALANCER;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (
    !endpoint ||
    !projectId ||
    !apiKey ||
    !functionId ||
    !redisUrl ||
    !redisToken
  ) {
    console.error("❌ Missing configuration");
    return;
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new Functions(client);
  const redis = new Redis({ url: redisUrl, token: redisToken });

  try {
    console.log("1. Calling Appwrite Function (Tavily, Cost: 1)...");
    const start = performance.now();
    const execution = await functions.createExecution(
      functionId,
      JSON.stringify({ action: "getKey", provider: "tavily", cost: 1 })
    );
    const duration = performance.now() - start;

    if (execution.status !== "completed") {
      throw new Error(`Function execution failed: ${execution.status}`);
    }

    const response = JSON.parse(execution.responseBody);
    console.log(`   ✅ Function returned in ${duration.toFixed(2)}ms`);
    console.log("   Response:", response);

    if (!response.apiKey || !response.keyId) {
      throw new Error("Invalid response from function");
    }

    const keyId = response.keyId;
    const monthKey = getCurrentMonthKey();
    const creditsKey = `tavily:key:credits:${keyId}:${monthKey}`;

    console.log(`2. Verifying Redis Credits for key ${keyId}...`);
    const credits = await redis.get<number>(creditsKey);
    console.log(`   Credits in Redis: ${credits}`);

    if (credits === null || credits === undefined) {
      console.warn("   ⚠️ Credits key not found (maybe first use?)");
    } else {
      console.log("   ✅ Credits verified in Redis");
    }

    console.log("\n✅ Appwrite Function Logic Verified Successfully!");
  } catch (error) {
    console.error("❌ Verification Failed:", error);
  }
}

verifyAppwriteFunctionLogic().catch(console.error);
