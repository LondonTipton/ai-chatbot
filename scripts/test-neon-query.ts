import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function testQuery() {
  const dbUrl = process.env.NEON_CASELAW_1;
  if (!dbUrl) {
    console.error("NEON_CASELAW_1 not set");
    return;
  }

  const sql = neon(dbUrl);

  // From the test results, the first result was:
  // source: "CaseLaw", source_file: "scan0004.json", chunk_index: "20"

  const source = "CaseLaw";
  const sourceFile = "scan0004.json";
  const chunkIndexStr = "20";
  const chunkIndexInt = Number.parseInt(chunkIndexStr, 10);

  console.log(
    `Querying for: source=${source}, source_file=${sourceFile}, chunk_index=${chunkIndexInt}`
  );

  try {
    const rows = await sql`
      SELECT source, source_file, chunk_index, doc_id, LEFT(full_text, 100) as text_preview
      FROM legal_documents
      WHERE source = ${source}
        AND source_file = ${sourceFile}
        AND chunk_index = ${chunkIndexInt}
      LIMIT 1
    `;

    console.log(`Found ${rows.length} rows`);
    if (rows.length > 0) {
      console.log("Row:", rows[0]);
    } else {
      // Try finding similar
      console.log("\nSearching for similar source_file...");
      const similar = await sql`
        SELECT DISTINCT source_file
        FROM legal_documents
        WHERE source_file LIKE ${`%${sourceFile.substring(0, 8)}%`}
        LIMIT 5
      `;
      console.log(
        "Similar files:",
        similar.map((r) => r.source_file)
      );
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testQuery();
