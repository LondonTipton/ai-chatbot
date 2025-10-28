const postgres = require("postgres");

async function checkUserIds() {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error("❌ POSTGRES_URL environment variable is not set");
    process.exit(1);
  }

  console.log("Checking user IDs in the database...");

  try {
    const client = postgres(databaseUrl);

    // Get a few sample user IDs to see their format
    console.log("🔍 Sample user IDs from database:");
    const users = await client`
      SELECT id, email, "appwriteId", "createdAt" 
      FROM "User" 
      LIMIT 5
    `;

    for (const user of users) {
      console.log(`  - DB ID: ${user.id} (${user.id.length} chars)`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Appwrite ID: ${user.appwriteId || "NULL"}`);
      console.log(`    Created: ${user.createdAt}`);
      console.log("");
    }

    // Look for users with appwriteId that matches our failing ID
    const problematicUserId = "68fb635b00142e5f4ed8";
    console.log(
      `🔍 Looking for user with appwriteId matching: ${problematicUserId}`
    );

    const matchingUsers = await client`
      SELECT id, email, "appwriteId"
      FROM "User" 
      WHERE "appwriteId" = ${problematicUserId}
    `;

    if (matchingUsers.length > 0) {
      console.log(`✅ Found ${matchingUsers.length} matching user(s):`);
      for (const user of matchingUsers) {
        console.log(`  - Database UUID: ${user.id}`);
        console.log(`  - Email: ${user.email}`);
        console.log(`  - Appwrite ID: ${user.appwriteId}`);
      }
    } else {
      console.log(`❌ No users found with appwriteId: ${problematicUserId}`);
    }

    await client.end();
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
}

checkUserIds();
