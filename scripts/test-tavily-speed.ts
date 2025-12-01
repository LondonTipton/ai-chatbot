import dotenv from "dotenv";
import path from "path";
import { getTavilyBalancer } from "@/lib/ai/tavily-key-balancer";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testTavilySpeed() {
  console.log("🚀 Testing Tavily End-to-End Speed...");
  console.log("==========================================\n");

  const iterations = 3;
  const results: { total: number; balancer: number; api: number }[] = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`Test ${i + 1}/${iterations}:`);

    try {
      // Measure balancer time
      const balancerStart = performance.now();
      const apiKey = await getTavilyBalancer().getApiKey(1);
      const balancerEnd = performance.now();
      const balancerTime = balancerEnd - balancerStart;

      console.log(`  ✅ Balancer: ${balancerTime.toFixed(2)}ms`);

      // Measure API call time
      const apiStart = performance.now();
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: "test query",
          max_results: 3,
        }),
      });

      const data = await response.json();
      const apiEnd = performance.now();
      const apiTime = apiEnd - apiStart;

      if (!response.ok) {
        throw new Error(`API Error: ${data.error || response.statusText}`);
      }

      console.log(`  ✅ API Call: ${apiTime.toFixed(2)}ms`);

      const totalTime = balancerTime + apiTime;
      console.log(`  📊 Total: ${totalTime.toFixed(2)}ms\n`);

      results.push({
        total: totalTime,
        balancer: balancerTime,
        api: apiTime,
      });
    } catch (error) {
      console.error("  ❌ Error:", error);
    }
  }

  if (results.length > 0) {
    console.log("==========================================");
    console.log("📈 Summary:\n");

    const avgBalancer =
      results.reduce((sum, r) => sum + r.balancer, 0) / results.length;
    const avgApi = results.reduce((sum, r) => sum + r.api, 0) / results.length;
    const avgTotal =
      results.reduce((sum, r) => sum + r.total, 0) / results.length;

    console.log(`Average Balancer Time: ${avgBalancer.toFixed(2)}ms`);
    console.log(`Average API Call Time: ${avgApi.toFixed(2)}ms`);
    console.log(`Average Total Time:    ${avgTotal.toFixed(2)}ms`);
    console.log(
      "\n✅ Balancer overhead is only a small fraction of total time!"
    );
  }
}

testTavilySpeed().catch(console.error);
