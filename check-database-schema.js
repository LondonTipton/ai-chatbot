const postgres = require("postgres");

async function checkSchema() {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error("❌ POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("Checking database schema...");

  try {
    const client = postgres(databaseUrl);

    // Check if Chat table exists and get its structure
    console.log("🔍 Checking Chat table structure...");
    const chatColumns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Chat' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    if (chatColumns.length === 0) {
      console.log("❌ Chat table not found!");
    } else {
      console.log("✅ Chat table found with columns:");
      chatColumns.forEach((col) => {
        console.log(
          `  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`
        );
      });
    }

    // Check if we can query the Chat table
    console.log("\n🔍 Testing Chat table query...");
    const chatCount = await client`SELECT COUNT(*) as count FROM "Chat"`;
    console.log(
      `✅ Chat table query successful. Row count: ${chatCount[0].count}`
    );

    // Test a simple user query
    console.log("\n🔍 Testing User table...");
    const userCount = await client`SELECT COUNT(*) as count FROM "User"`;
    console.log(
      `✅ User table query successful. Row count: ${userCount[0].count}`
    );

    await client.end();
    console.log("\n✅ Database schema check completed successfully");
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
}

checkSchema();
