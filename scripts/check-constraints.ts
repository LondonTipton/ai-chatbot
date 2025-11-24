import { sql } from "drizzle-orm";
import { db } from "../lib/db/index";

async function checkConstraints() {
  console.log("Checking foreign key constraints on Chat table...\n");

  const result = await db.execute(sql`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (ccu.table_name = 'Chat' OR tc.table_name = 'Chat')
    ORDER BY tc.table_name;
  `);

  console.log("Foreign key constraints:", JSON.stringify(result.rows, null, 2));
}

checkConstraints().catch(console.error);
