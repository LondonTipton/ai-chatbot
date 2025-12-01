// Script to generate sparse embeddings for testing in Zilliz Cloud console

const MODAL_SPARSE_URL =
  "https://chidzawoa--legal-search-api-generate-sparse-embedding.modal.run";

async function generateSparseForConsole(query: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Query: "${query}"`);
  console.log("=".repeat(70));

  try {
    const response = await fetch(MODAL_SPARSE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const sparseVector = data.sparse_embedding;

    // Convert string keys to integers for Zilliz
    const sparseIntKeys: Record<number, number> = {};
    for (const [key, value] of Object.entries(
      sparseVector as Record<string, number>
    )) {
      sparseIntKeys[Number.parseInt(key, 10)] = value;
    }

    console.log("\n✅ Sparse Embedding Generated");
    console.log(`   Non-zero dimensions: ${Object.keys(sparseIntKeys).length}`);

    // Format for Zilliz Cloud console
    console.log("\n📋 Copy this for Zilliz Cloud Console:");
    console.log("─".repeat(70));
    console.log(JSON.stringify(sparseIntKeys, null, 2));
    console.log("─".repeat(70));

    // Also show as single line (easier to copy)
    console.log("\n📋 Single-line version:");
    console.log(JSON.stringify(sparseIntKeys));

    // Show top 10 dimensions by weight
    const sorted = Object.entries(sparseIntKeys)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    console.log("\n🔝 Top 10 dimensions by weight:");
    sorted.forEach(([idx, weight]) => {
      console.log(`   ${idx}: ${(weight as number).toFixed(6)}`);
    });
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

async function main() {
  // Just generate for one query to make it easy to copy
  const query = "contract breach";

  console.log("\n🔍 Generating Sparse Embedding for Zilliz Console Testing\n");
  await generateSparseForConsole(query);

  console.log("\n" + "=".repeat(70));
  console.log("💡 How to use in Zilliz Cloud Console:");
  console.log("=".repeat(70));
  console.log(`
1. Go to your Zilliz Cloud console
2. Navigate to your collection: hybrid_caselaw_collection
3. Click "Query" or "Search"
4. Select "sparse_vector" field
5. Paste the JSON object above as the query vector
6. Set limit (e.g., 5-10 results)
7. Run the search!

Example search request format:
{
  "collectionName": "hybrid_caselaw_collection",
  "vector": <paste the sparse embedding here>,
  "annsField": "sparse_vector",
  "limit": 5,
  "outputFields": ["text", "case_identifier"]
}
`);
}

main();
