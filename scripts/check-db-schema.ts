import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const runCheck = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const sql = postgres(process.env.POSTGRES_URL);

  console.log("Checking schema for Message_v2 table...");

  const columns = await sql`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'Message_v2'
    ORDER BY column_name;
  `;

  console.table(columns);

  console.log("\nChecking schema for Message table (deprecated)...");
  const columnsOld = await sql`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'Message'
    ORDER BY column_name;
  `;
  console.table(columnsOld);

  console.log("\nChecking schema for Stream table...");
  const columnsStream = await sql`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'Stream'
    ORDER BY column_name;
  `;
  console.table(columnsStream);

  await sql.end();
};

runCheck().catch(console.error);
