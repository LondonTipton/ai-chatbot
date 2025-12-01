import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkDatabase() {
  const dbUrl = process.env.NEON_CASELAW_1;
  if (!dbUrl) {
    console.error("NEON_CASELAW_1 not set");
    return;
  }

  const sql = neon(dbUrl);

  try {
    // Check if table exists
    console.log("Checking for legal_documents table...");
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(
      "Tables:",
      tables.map((t) => t.table_name)
    );

    // Try to get a sample row
    console.log("\nQuerying sample row...");
    const sample = await sql`SELECT * FROM legal_documents LIMIT 1`;
    console.log("Sample row columns:", Object.keys(sample[0] || {}));
    console.log("Sample data:", sample[0]);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

checkDatabase();
