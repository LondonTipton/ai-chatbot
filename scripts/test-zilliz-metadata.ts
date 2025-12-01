import { MilvusClient } from "@zilliz/milvus2-sdk-node";

const ZILLIZ_URI = "https://in05-5d7fef17cd6de63.serverless.aws-eu-central-1.cloud.zilliz.com";
const ZILLIZ_TOKEN = process.env.ZILLIZ_TOKEN || "9a590f9bf97ef1646023b27b94208c78c3159f49be7166adda2f34c42dbeb0b6c656d4130b62519fbb24516cdeb96772cdb615d3";
const COLLECTION_NAME = "hybrid_caselaw_collection";
const MODAL_URL = "https://chrismutibvu--legal-search-8b-fast-gpu-a10-fastgpusearch-ce0540.modal.run";

async function main() {
  console.log("🔍 Direct Zilliz Query Test\n");

  // Step 1: Get embedding for a test query
  console.log("Step 1: Getting embedding from Modal...");
  const testQuery = "employment law Zimbabwe";
  
  const embedResponse = await fetch(`${MODAL_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: testQuery })
  });

  const embedData = await embedResponse.json();
  const embedding = embedData.embedding;
  console.log(`✅ Got embedding: ${embedding.length} dimensions\n`);

  // Step 2: Query Zilliz directly
  console.log("Step 2: Querying Zilliz directly...");
  const client = new MilvusClient({
    address: ZILLIZ_URI,
    token: ZILLIZ_TOKEN,
  });

  const searchResults = await client.search({
    collection_name: COLLECTION_NAME,
    vectors: [embedding],
    limit: 3,
    output_fields: ["text", "source", "source_file", "chunk_index", "metadata"],
  });

  console.log("✅ Search completed\n");
  console.log("📊 Raw Results:");
  console.log(JSON.stringify(searchResults, null, 2));
  
  console.log("\n\n🔬 Detailed Analysis:");
  if (searchResults.results && searchResults.results.length > 0) {
    const firstBatch = searchResults.results[0];
    if (firstBatch && firstBatch.length > 0) {
      firstBatch.forEach((hit: any, idx: number) => {
        console.log(`\n--- Result ${idx + 1} ---`);
        console.log("Score:", hit.score || hit.distance);
        console.log("ID:", hit.id);
        console.log("Source:", hit.source);
        console.log("Source File:", hit.source_file);
        console.log("Chunk Index:", hit.chunk_index);
        console.log("Metadata type:", typeof hit.metadata);
        console.log("Metadata value:", hit.metadata);
        
        if (hit.metadata) {
          try {
            const parsed = typeof hit.metadata === 'string' ? JSON.parse(hit.metadata) : hit.metadata;
            console.log("Parsed metadata:", parsed);
            console.log("Has doc_id?", !!parsed.doc_id);
            if (parsed.doc_id) {
              console.log("doc_id value:", parsed.doc_id);
            }
          } catch (e) {
            console.log("Failed to parse metadata:", e);
          }
        }
      });
    }
  }
}

main().catch(console.error);
