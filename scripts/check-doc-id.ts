import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkDocId() {
  const dbUrl = process.env.NEON_CASELAW_1;
  if (!dbUrl) {
    console.error("NEON_CASELAW_1 not set");
    return;
  }

  const sql = neon(dbUrl);
  const docId = "60ddd1c79dfa"; // From Zilliz result

  console.log(`Checking for doc_id: ${docId}`);

  try {
    const rows = await sql`
      SELECT source, source_file, chunk_index, doc_id
      FROM legal_documents
      WHERE doc_id = ${docId}
    `;

    console.log("Rows found:", rows);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

checkDocId();
