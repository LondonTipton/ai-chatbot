import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chat, user } from "../lib/db/schema.js";

// Load environment variables
config({ path: ".env.local" });

const client = postgres(process.env.POSTGRES_URL || "");
const db = drizzle(client, { schema: { user, chat } });

async function diagnoseChat404() {
  console.log("=== Diagnosing Chat 404 Issue ===\n");

  try {
    // Get all users
    const users = await db.select().from(user).limit(10);
    console.log(`Found ${users.length} users in database:`);
    users.forEach((u) => {
      console.log(
        `  - ID: ${u.id}, Email: ${u.email}, AppwriteId: ${
          u.appwriteId || "null"
        }, IsGuest: ${u.isGuest}`
      );
    });

    console.log("\n");

    // Get all chats
    const chats = await db.select().from(chat).limit(20);
    console.log(`Found ${chats.length} chats in database:`);
    chats.forEach((c) => {
      console.log(`  - Chat ID: ${c.id}`);
      console.log(`    Title: ${c.title}`);
      console.log(`    User ID: ${c.userId}`);
      console.log(`    Visibility: ${c.visibility}`);
      console.log(`    Created: ${c.createdAt}`);
      console.log("");
    });

    // Check for orphaned chats (chats with non-existent user IDs)
    console.log("\n=== Checking for orphaned chats ===");
    for (const c of chats) {
      const [chatUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, c.userId));
      if (!chatUser) {
        console.log(
          `⚠️  ORPHANED CHAT FOUND: ${c.id} (title: "${c.title}") - User ${c.userId} does not exist!`
        );
      }
    }

    console.log("\n=== Diagnosis Complete ===");
  } catch (error) {
    console.error("Error during diagnosis:", error);
  }

  process.exit(0);
}

diagnoseChat404();
