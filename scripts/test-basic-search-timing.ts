import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function testBasicSearchTiming() {
  console.log("\\n=== Basic Search Workflow - Detailed Timing Test ===\\n");
  
  const startTime = performance.now();
  
  const { basicSearchWorkflowV2 } = await import("../mastra/workflows/basic-search-workflow-v2");
  
  const run = await basicSearchWorkflowV2.createRunAsync();
  
  const result = await run.start({
    inputData: {
      query: "What are the rights of an employee during retrenchment in Zimbabwe?",
      jurisdiction: "Zimbabwe",
      conversationHistory: [],
    },
  });
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  console.log("\\n=== Timing Summary ===");
  console.log(`Total workflow time: ${totalTime.toFixed(0)}ms (${(totalTime/1000).toFixed(2)}s)`);
  console.log(`\\nStatus: ${result.status}`);
  
  if (result.status === "success" && result.steps) {
    const searchStep = result.steps["search"];
    if (searchStep?.output) {
      console.log(`\\nResults found: ${searchStep.output.sources?.length || 0} sources`);
      console.log(`Response length: ${searchStep.output.response?.length || 0} characters`);
    }
  }
  
  console.log("\\n=== End Test ===\\n");
}

testBasicSearchTiming().catch(console.error);
