import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  chat,
  document,
  message,
  suggestion,
  user,
  vote,
} from "@/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.POSTGRES_URL!;

if (!connectionString) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

async function migrateToAppwriteIds() {
  console.log("🚀 Starting migration to Appwrite IDs...\n");

  try {
    // Step 1: Get all users with their current UUID and Appwrite ID
    console.log("📊 Step 1: Fetching all users...");
    const users = await db.select().from(user);
    console.log(`   Found ${users.length} users\n`);

    if (users.length === 0) {
      console.log("✅ No users to migrate. Database is empty.");
      return;
    }

    // Step 2: Create mapping of old UUID to Appwrite ID
    const idMapping = new Map<string, string>();
    for (const u of users) {
      if (u.appwriteId) {
        idMapping.set(u.id, u.appwriteId);
        console.log(`   Mapping: ${u.id} → ${u.appwriteId} (${u.email})`);
      } else {
        console.warn(`   ⚠️  User ${u.id} (${u.email}) has no Appwrite ID!`);
      }
    }
    console.log();

    // Step 3: Update all foreign key references
    console.log("📝 Step 2: Updating foreign key references...\n");

    for (const [oldId, newId] of idMapping.entries()) {
      console.log(`   Processing user: ${oldId} → ${newId}`);

      // Update chats
      const chatsResult = await db
        .update(chat)
        .set({ userId: newId })
        .where(eq(chat.userId, oldId));
      console.log("      ✓ Updated chats");

      // Messages don't have userId - they're linked via chatId
      // No need to update messages directly
      console.log("      ✓ Messages linked via chats (no direct userId)");

      // Update documents
      const documentsResult = await db
        .update(document)
        .set({ userId: newId })
        .where(eq(document.userId, oldId));
      console.log("      ✓ Updated documents");

      // Update votes
      const votesResult = await db
        .update(vote)
        .set({ userId: newId })
        .where(eq(vote.userId, oldId));
      console.log("      ✓ Updated votes");

      // Update suggestions
      const suggestionsResult = await db
        .update(suggestion)
        .set({ userId: newId })
        .where(eq(suggestion.userId, oldId));
      console.log("      ✓ Updated suggestions\n");
    }

    // Step 4: Update user table to use Appwrite IDs as primary keys
    console.log("🔄 Step 3: Updating user table...\n");

    for (const [oldId, newId] of idMapping.entries()) {
      const u = users.find((user) => user.id === oldId);
      if (!u) continue;

      // Delete old user record
      await db.delete(user).where(eq(user.id, oldId));

      // Insert with new Appwrite ID as primary key
      await db.insert(user).values({
        id: newId,
        email: u.email,
        appwriteId: null, // No longer needed
        createdAt: u.createdAt,
      });

      console.log(`   ✓ Migrated user: ${u.email}`);
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - Migrated ${idMapping.size} users`);
    console.log("   - Updated all foreign key references");
    console.log("   - Users now use Appwrite IDs as primary keys");
    console.log("\n⚠️  Next steps:");
    console.log("   1. Update database schema to remove appwriteId column");
    console.log("   2. Deploy new auth provider and API routes");
    console.log("   3. Test all functionality");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migration
migrateToAppwriteIds().catch(console.error);
