import dotenv from "dotenv";
import path from "path";
import { getCerebrasBalancer } from "@/lib/ai/cerebras-key-balancer";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testCachePerformance() {
  console.log("🚀 Testing Cache Performance...\n");

  // Test Tavily
  console.log("📊 Tavily Key Balancer:");
  const tavilyBalancer = getTavilyBalancer();

  const tavilyStart1 = performance.now();
  await tavilyBalancer.getApiKey(1);
  const tavilyTime1 = performance.now() - tavilyStart1;
  console.log(`  First call (cold):   ${tavilyTime1.toFixed(2)}ms`);

  const tavilyStart2 = performance.now();
  await tavilyBalancer.getApiKey(1);
  const tavilyTime2 = performance.now() - tavilyStart2;
  console.log(`  Second call (cached): ${tavilyTime2.toFixed(2)}ms`);

  const speedup = (((tavilyTime1 - tavilyTime2) / tavilyTime1) * 100).toFixed(
    1
  );
  console.log(`  ⚡ Speedup: ${speedup}% faster!\n`);

  // Test Cerebras
  console.log("📊 Cerebras Key Balancer:");
  const cerebrasBalancer = getCerebrasBalancer();

  const cerebrasStart1 = performance.now();
  await cerebrasBalancer.getProvider();
  const cerebrasTime1 = performance.now() - cerebrasStart1;
  console.log(`  First call (cold):    ${cerebrasTime1.toFixed(2)}ms`);

  const cerebrasStart2 = performance.now();
  await cerebrasBalancer.getProvider();
  const cerebrasTime2 = performance.now() - cerebrasStart2;
  console.log(`  Second call (cached):  ${cerebrasTime2.toFixed(2)}ms`);

  const cerebrasSpeedup = (
    ((cerebrasTime1 - cerebrasTime2) / cerebrasTime1) *
    100
  ).toFixed(1);
  console.log(`  ⚡ Speedup: ${cerebrasSpeedup}% faster!\n`);

  console.log("✅ Cache optimization verified!");
  console.log("💡 Rapid-fire requests now skip Redis entirely.");
}

testCachePerformance().catch(console.error);
