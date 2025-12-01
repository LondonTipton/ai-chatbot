import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

async function testWorkflows() {
  console.log("Starting Workflow Integration Tests...");

  const workflows = [
    { name: "Basic Search", path: "../mastra/workflows/basic-search-workflow-v2", export: "basicSearchWorkflowV2" },
    // { name: "Advanced Search", path: "../mastra/workflows/advanced-search-workflow-v2", export: "advancedSearchWorkflowV2" },
    // { name: "Enhanced Comprehensive", path: "../mastra/workflows/enhanced-comprehensive-workflow-v2", export: "enhancedComprehensiveWorkflowV2" },
    // { name: "Multi-Search", path: "../mastra/workflows/multi-search-workflow", export: "multiSearchWorkflow" }
  ];

  for (const wf of workflows) {
    console.log(`\nTesting ${wf.name} Workflow...`);
    try {
      const module = await import(wf.path);
      const workflow = module[wf.export];

      // Create a run
      const run = await workflow.createRunAsync();

      // Start the run
      const result = await run.start({
        inputData: {
          query: "What are the rights of an employee during retrenchment in Zimbabwe?",
          jurisdiction: "Zimbabwe",
          conversationHistory: [],
        },
      });

      console.log(`${wf.name} Run Status:`, result.status);

      if (result.status === "success") {
        // Display step timing
        console.log(`\n--- ${wf.name} Detailed Results ---`);
        
        if (result.steps) {
          const stepKeys = Object.keys(result.steps);
          console.log(`\nSteps executed (${stepKeys.length}):`);
          
          stepKeys.forEach((stepKey, idx) => {
            const step = result.steps[stepKey];
            console.log(`\n${idx + 1}. Step: ${stepKey}`);
            console.log(`   Status: ${step.status}`);
            
            // Show output summary
            if (step.output) {
              const output = step.output;
              
              // For query enhancement
              if (output.variations && output.hydePassage) {
                console.log(`   Generated ${output.variations.length} variations`);
                console.log(`   Variations: ${output.variations.join(', ').substring(0, 100)}...`);
                console.log(`   HyDE passage: ${output.hydePassage.substring(0, 100)}...`);
              }
              
              // For search results
              if (output.results && Array.isArray(output.results)) {
                console.log(`   Found ${output.results.length} results`);
                if (output.results.length > 0) {
                  console.log(`   First result source: ${output.results[0].source || 'N/A'}`);
                  console.log(`   First result file: ${output.results[0].sourceFile || output.results[0].source_file || 'N/A'}`);
                }
              }
              
              // For synthesis
              if (output.response) {
                console.log(`   Response length: ${output.response.length} chars`);
              }
              
              if (output.sources && Array.isArray(output.sources)) {
                console.log(`   Total sources: ${output.sources.length}`);
              }
            }
          });
        }
        
        console.log(`\n--- End ${wf.name} Results ---\n`);

        // Check for legal search results
        const stepKeys = Object.keys(result.steps || {});
        const lastStep = stepKeys[stepKeys.length - 1];
        const output = result.steps?.[lastStep]?.output;

        const response = output?.response;

        if (response && (response.includes("INTERNAL LEGAL DATABASE RESULTS") || response.includes("LEGAL RESULT"))) {
          console.log(`✅ SUCCESS: ${wf.name} returned Legal Search results.`);
        } else {
          console.log(`⚠️  WARNING: ${wf.name} did NOT return expected Legal Search markers.`);
        }
      } else {
        console.error(`❌ ${wf.name} Run Failed:`, result);
      }
    } catch (error: any) {
      console.error(`${wf.name} Test Failed:`, error);
    }
  }
}

testWorkflows();
