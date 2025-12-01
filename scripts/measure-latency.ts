import dotenv from "dotenv";
import path from "path";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function measureLatency() {
  console.log("Starting Latency Measurement...");
  console.log("--------------------------------");

  const tavilyBalancer = getTavilyBalancer();
  const iterations = 5;
  let totalTavilyTime = 0;

  console.log("\nMeasuring Tavily Load Balancer Latency:");
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await tavilyBalancer.getApiKey(1); // Cost 1
      const end = performance.now();
      const duration = end - start;
      console.log(`Call ${i + 1}: ${duration.toFixed(2)}ms`);
      totalTavilyTime += duration;
    } catch (error) {
      console.error(`Call ${i + 1} failed:`, error);
    }
  }

  const avgTavily = totalTavilyTime / iterations;
  console.log(`\nAverage Tavily Latency: ${avgTavily.toFixed(2)}ms`);
  console.log("--------------------------------");
}

measureLatency().catch(console.error);
