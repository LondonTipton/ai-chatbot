const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { chat, user } = require("./lib/db/schema.ts");
const { eq, desc } = require("drizzle-orm");

async function testGetChatsByUserId() {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error("❌ POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("Testing getChatsByUserId function...");

  try {
    const client = postgres(databaseUrl);
    const db = drizzle(client, {
      schema: {
        user,
        chat,
      },
    });

    // Test user ID (from the logs we can see a user exists)
    const testUserId = "68fb635b00142e5f4ed8"; // From the logs

    console.log(`🔍 Testing query for userId: ${testUserId}`);

    // Try the exact query from getChatsByUserId
    const result = await db
      .select()
      .from(chat)
      .where(eq(chat.userId, testUserId))
      .orderBy(desc(chat.createdAt))
      .limit(21); // Using limit+1 as in the original

    console.log(`✅ Query successful! Found ${result.length} chats`);
    console.log(
      "First few results:",
      JSON.stringify(result.slice(0, 3), null, 2)
    );

    await client.end();
  } catch (error) {
    console.error("❌ Query failed:", error.message);
    console.error("Error details:", error);

    // Print more specific error info
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.detail) {
      console.error("Error detail:", error.detail);
    }
    if (error.hint) {
      console.error("Error hint:", error.hint);
    }
  }
}

testGetChatsByUserId();
