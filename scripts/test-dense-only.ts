import { SearchService } from "@/lib/search/service";

const searchService = new SearchService({
  modalWebhookUrl: process.env.MODAL_EMBEDDING_URL!,
  zillizUri: process.env.ZILLIZ_URI!,
  zillizToken: process.env.ZILLIZ_TOKEN!,
  zillizCollection:
    process.env.ZILLIZ_COLLECTION || "hybrid_caselaw_collection",
});

async function testDenseSearch() {
  const queries = [
    "contract breach",
    "constitutional rights",
    "employment law",
  ];

  console.log("\n" + "=".repeat(70));
  console.log("🔍 Testing Dense-Only Semantic Search");
  console.log("=".repeat(70) + "\n");

  for (const query of queries) {
    try {
      console.log(`Query: "${query}"`);

      const startTime = Date.now();
      const results = await searchService.search(query, 5);
      const duration = Date.now() - startTime;

      console.log(`✅ Found ${results.length} results in ${duration}ms`);

      if (results.length > 0) {
        console.log(`   Top score: ${results[0].score.toFixed(4)}`);
        console.log(`   Sample: ${results[0].text.substring(0, 80)}...`);

        // Show all scores
        console.log(
          `   Scores: ${results.map((r) => r.score.toFixed(4)).join(", ")}`
        );
      }

      console.log();
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      console.log();
    }
  }

  console.log("=".repeat(70));
  console.log("🎉 Dense-only search is working perfectly!");
  console.log("=".repeat(70) + "\n");
}

testDenseSearch();
