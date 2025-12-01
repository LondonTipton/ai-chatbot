import dotenv from "dotenv";
import path from "path";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function measureCerebrasLatency() {
  console.log("Starting Cerebras Latency Measurement...");
  console.log("--------------------------------");

  const iterations = 5;
  let totalTime = 0;

  console.log("\nMeasuring Cerebras Load Balancer Latency (Direct Redis):");
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await getBalancedCerebrasProvider();
      const end = performance.now();
      const duration = end - start;
      console.log(`Call ${i + 1}: ${duration.toFixed(2)}ms`);
      totalTime += duration;
    } catch (error) {
      console.error(`Call ${i + 1} failed:`, error);
    }
  }

  const avg = totalTime / iterations;
  console.log(`\nAverage Cerebras Latency: ${avg.toFixed(2)}ms`);
  console.log("--------------------------------");
}

measureCerebrasLatency().catch(console.error);
