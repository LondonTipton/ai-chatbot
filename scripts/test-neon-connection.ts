import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

async function testNeonConnection() {
  console.log("🔍 Testing Neon Database Connections...\n");

  const DB_CONFIG = {
    CaseLaw: [
      process.env.NEON_CASELAW_1,
      process.env.NEON_CASELAW_2,
      process.env.NEON_CASELAW_3,
    ].filter(Boolean) as string[],
    LawPortal: [
      process.env.NEON_LAWPORTAL_1,
      process.env.NEON_LAWPORTAL_2,
      process.env.NEON_LAWPORTAL_3,
    ].filter(Boolean) as string[],
    Zimlii: [process.env.NEON_ZIMLII_1, process.env.NEON_ZIMLII_2].filter(
      Boolean
    ) as string[],
  };

  // Test each database
  for (const [category, urls] of Object.entries(DB_CONFIG)) {
    console.log(`\n📂 Testing ${category} databases (${urls.length} URLs):`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`\n  Database ${i + 1}/${urls.length}:`);

      try {
        const sql = neon(url);

        // Test 1: Check if table exists
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'legal_documents'
          ) as table_exists
        `;
        console.log("    ✅ Connection successful");
        console.log(`    📋 Table exists: ${tableCheck[0].table_exists}`);

        if (tableCheck[0].table_exists) {
          // Test 2: Count total rows
          const countResult = await sql`
            SELECT COUNT(*) as total FROM legal_documents
          `;
          console.log(`    📊 Total rows: ${countResult[0].total}`);

          // Test 3: Get sample row
          const sampleRow = await sql`
            SELECT doc_id, source, source_file, chunk_index, 
                   LENGTH(full_text) as text_length
            FROM legal_documents
            LIMIT 1
          `;

          if (sampleRow.length > 0) {
            console.log("    📄 Sample row:", {
              doc_id: sampleRow[0].doc_id,
              source: sampleRow[0].source,
              source_file: sampleRow[0].source_file,
              chunk_index: sampleRow[0].chunk_index,
              text_length: sampleRow[0].text_length,
            });
          }

          // Test 4: Check for specific doc_id from logs
          const testDocId = "799637fd0e6c";
          const testResult = await sql`
            SELECT doc_id, source, source_file, chunk_index
            FROM legal_documents
            WHERE doc_id = ${testDocId}
            LIMIT 5
          `;
          console.log(
            `    🔍 Test doc_id (${testDocId}): ${testResult.length} rows found`
          );
          if (testResult.length > 0) {
            console.log("       First match:", testResult[0]);
          }
        }
      } catch (error: any) {
        console.error(`    ❌ Error: ${error.message}`);
      }
    }
  }
}

testNeonConnection().catch(console.error);
