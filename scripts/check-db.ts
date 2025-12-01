import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const checkDb = async () => {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not defined in .env.local");
    process.exit(1);
  }

  console.log("Connecting to:", url.replace(/:[^:@]+@/, ":***@"));
  const sql = postgres(url);

  try {
    // Check all schemas
    const tables = await sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `;

    console.log(`\nFound ${tables.length} tables:\n`);

    for (const t of tables) {
      console.log(`[${t.table_schema}] ${t.table_name}`);

      // Try to get row count
      try {
        const result =
          await sql`SELECT COUNT(*) as count FROM ${sql(t.table_schema)}.${sql(t.table_name)}`;
        console.log(`  → ${result[0].count} rows`);
      } catch (e) {
        console.log("  → Unable to count rows");
      }
    }
  } catch (error) {
    console.error("Error checking DB:", error);
  } finally {
    await sql.end();
  }
};

checkDb();
