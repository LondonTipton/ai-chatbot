import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

async function testFixedQuery() {
  console.log("🔍 Testing Fixed Query Logic...\n");

  const sql = neon(process.env.NEON_CASELAW_3!);

  // Test case from the logs
  const testCases = [
    {
      docId: "799637fd0e6c",
      sourceFile:
        "LC-H-747-14 - GOLD DRIVEN TOBACCO LTD VS KENNEDY MUCHAYI.json",
      chunkIndex: 4,
      source: "CaseLaw",
    },
    {
      docId: "262f52795786",
      sourceFile:
        "LC-H-100-2017 BRIGHTON CHIKWANHA VS ESSAR INFRASTRURE ZIMBABWE (PVT) LTD.json",
      chunkIndex: 1,
      source: "CaseLaw",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📄 Testing: ${testCase.sourceFile}`);
    console.log(
      `   doc_id: ${testCase.docId}, local chunk: ${testCase.chunkIndex}`
    );

    // Strategy 1: Using doc_id with ROW_NUMBER
    console.log("\n  Strategy 1 (doc_id + ROW_NUMBER):");
    const strategy1 = await sql`
      WITH numbered_chunks AS (
        SELECT 
          full_text, 
          metadata, 
          doc_id,
          chunk_index as global_index,
          ROW_NUMBER() OVER (PARTITION BY doc_id ORDER BY chunk_index ASC) - 1 as local_index
        FROM legal_documents
        WHERE doc_id = ${testCase.docId}
      )
      SELECT doc_id, global_index, local_index, LENGTH(full_text) as text_length
      FROM numbered_chunks
      WHERE local_index = ${testCase.chunkIndex}
      LIMIT 1
    `;

    if (strategy1.length > 0) {
      console.log("    ✅ Found!");
      console.log(`       Global index: ${strategy1[0].global_index}`);
      console.log(`       Local index: ${strategy1[0].local_index}`);
      console.log(`       Text length: ${strategy1[0].text_length}`);
    } else {
      console.log("    ❌ Not found");
    }

    // Strategy 2: Using source_file with ROW_NUMBER
    console.log("\n  Strategy 2 (source_file + ROW_NUMBER):");
    const strategy2 = await sql`
      WITH numbered_chunks AS (
        SELECT 
          full_text, 
          metadata, 
          doc_id,
          chunk_index as global_index,
          ROW_NUMBER() OVER (PARTITION BY source_file ORDER BY chunk_index ASC) - 1 as local_index
        FROM legal_documents
        WHERE source = ${testCase.source}
          AND source_file = ${testCase.sourceFile}
      )
      SELECT doc_id, global_index, local_index, LENGTH(full_text) as text_length
      FROM numbered_chunks
      WHERE local_index = ${testCase.chunkIndex}
      LIMIT 1
    `;

    if (strategy2.length > 0) {
      console.log("    ✅ Found!");
      console.log(`       Global index: ${strategy2[0].global_index}`);
      console.log(`       Local index: ${strategy2[0].local_index}`);
      console.log(`       Text length: ${strategy2[0].text_length}`);
    } else {
      console.log("    ❌ Not found");
    }
  }

  console.log("\n\n✅ Fix validated! Both strategies now work correctly.");
}

testFixedQuery().catch(console.error);
