import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { SearchService } from "../lib/search/service";

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

console.log("Loading env from:", envLocalPath);
config({ path: envLocalPath });
console.log("Loading env from:", envPath);
config({ path: envPath });

async function main() {
  const query = "contract dispute";
  console.log(`Testing SearchService with query: "${query}"`);

  try {
    const searchService = new SearchService({
      modalWebhookUrl: process.env.MODAL_EMBEDDING_URL!,
      zillizUri: process.env.ZILLIZ_URI!,
      zillizToken: process.env.ZILLIZ_TOKEN!,
      zillizCollection: process.env.ZILLIZ_COLLECTION!,
    });

    console.log("1. Executing search...");
    const results = await searchService.search(query, 5);

    console.log(`   Found ${results.length} results.`);
    console.log("\nSearch Results:");
    console.log(JSON.stringify(results, null, 2));

    fs.writeFileSync(
      "test_results_service.json",
      JSON.stringify(results, null, 2)
    );
    console.log("Results written to test_results_service.json");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();
