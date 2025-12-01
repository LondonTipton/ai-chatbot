import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

async function testChunkIndexIssue() {
  console.log("🔍 Testing Chunk Index Issue...\n");

  const testDocId = "799637fd0e6c";
  const sql = neon(process.env.NEON_CASELAW_3!);

  // Get all chunks for this document
  const allChunks = await sql`
    SELECT doc_id, source_file, chunk_index, 
           LENGTH(full_text) as text_length,
           LEFT(full_text, 100) as text_preview
    FROM legal_documents
    WHERE doc_id = ${testDocId}
    ORDER BY chunk_index ASC
  `;

  console.log(`📄 Document: ${testDocId}`);
  console.log(`📊 Total chunks found: ${allChunks.length}\n`);

  if (allChunks.length > 0) {
    console.log("Chunk details:");
    allChunks.forEach((chunk, idx) => {
      console.log(`  Chunk ${idx} (local index):`);
      console.log(`    - Global chunk_index in DB: ${chunk.chunk_index}`);
      console.log(`    - Text length: ${chunk.text_length}`);
      console.log(`    - Preview: ${chunk.text_preview}...\n`);
    });

    console.log("\n🔍 Analysis:");
    console.log(
      `  - Zilliz returns local chunk index (0-${allChunks.length - 1})`
    );
    console.log(
      `  - Neon stores global chunk index (${allChunks[0].chunk_index}-${
        allChunks[allChunks.length - 1].chunk_index
      })`
    );
    console.log(
      "  - This mismatch causes the query to fail when using chunk_index directly"
    );

    // Test the fix: use ROW_NUMBER() to get local index
    console.log("\n✅ Testing fix with ROW_NUMBER():");
    const localChunkIndex = 4;
    const fixedQuery = await sql`
      WITH numbered_chunks AS (
        SELECT 
          doc_id, 
          source_file, 
          chunk_index,
          full_text,
          ROW_NUMBER() OVER (PARTITION BY doc_id ORDER BY chunk_index ASC) - 1 as local_index
        FROM legal_documents
        WHERE doc_id = ${testDocId}
      )
      SELECT * FROM numbered_chunks
      WHERE local_index = ${localChunkIndex}
    `;

    if (fixedQuery.length > 0) {
      console.log(`  ✅ Found chunk at local index ${localChunkIndex}:`);
      console.log(`     - Global chunk_index: ${fixedQuery[0].chunk_index}`);
      console.log(`     - Text length: ${fixedQuery[0].full_text.length}`);
    } else {
      console.log(`  ❌ No chunk found at local index ${localChunkIndex}`);
    }
  }
}

testChunkIndexIssue().catch(console.error);
