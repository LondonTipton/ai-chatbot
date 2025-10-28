import { db } from "./lib/db/queries.js";

console.log("Testing database connection...");

async function testConnection() {
  try {
    // Try a simple query to test the connection
    const result = await db.execute("SELECT 1 as test");
    console.log("✅ Database connection successful:", result);

    // Check if tables exist
    const tablesResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log(
      "📋 Available tables:",
      tablesResult.rows.map((row) => row.table_name)
    );
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

testConnection();
