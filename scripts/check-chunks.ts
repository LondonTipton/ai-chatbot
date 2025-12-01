import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

(async () => {
  const sql = neon(process.env.NEON_CASELAW_1!);
  const rows =
    await sql`SELECT chunk_index FROM legal_documents WHERE source_file='scan0004.json' ORDER BY chunk_index`;
  console.log(
    "Chunk indices for scan0004.json:",
    rows.map((r) => r.chunk_index)
  );
})();
