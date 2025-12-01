import dotenv from "dotenv";
import { Client, Functions } from "node-appwrite";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function measureAppwriteLatency() {
  console.log("Starting Appwrite Function Latency Measurement...");
  console.log("--------------------------------");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID_LOAD_BALANCER;

  if (!endpoint || !projectId || !apiKey || !functionId) {
    console.error("Missing Appwrite configuration");
    return;
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new Functions(client);
  const iterations = 5;
  let totalTime = 0;

  console.log("\nMeasuring Appwrite Function Latency (Parallel Reads):");
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await functions.createExecution(
        functionId,
        JSON.stringify({ action: "getKey", provider: "tavily", cost: 1 })
      );
      const end = performance.now();
      const duration = end - start;
      console.log(`Call ${i + 1}: ${duration.toFixed(2)}ms`);
      totalTime += duration;
    } catch (error) {
      console.error(`Call ${i + 1} failed:`, error);
    }
  }

  const avg = totalTime / iterations;
  console.log(`\nAverage Appwrite Function Latency: ${avg.toFixed(2)}ms`);
  console.log("--------------------------------");
}

measureAppwriteLatency().catch(console.error);
