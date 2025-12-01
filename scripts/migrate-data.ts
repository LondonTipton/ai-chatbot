import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type {
  Chat,
  DBMessage,
  Document,
  MessageDeprecated,
  Payment,
  Stream,
  Subscription,
  Suggestion,
  User,
  Vote,
  VoteDeprecated,
} from "../lib/db/schema";
import {
  chat,
  document,
  message,
  messageDeprecated,
  payment,
  stream,
  subscription,
  suggestion,
  user,
  vote,
  voteDeprecated,
} from "../lib/db/schema";

config({ path: ".env.local" });

const runMigration = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined in .env.local");
  }

  if (!process.env.NEW_DB_URL) {
    throw new Error("NEW_DB_URL is not defined in environment variables");
  }

  console.log("Connecting to OLD database...");
  const oldClient = postgres(process.env.POSTGRES_URL);

  console.log("Connecting to NEW database...");
  const newClient = postgres(process.env.NEW_DB_URL);
  const newDb = drizzle(newClient);

  try {
    console.log("Starting data migration...\n");

    // 1. Users
    console.log("Migrating Users...");
    const users = await oldClient<User[]>`SELECT * FROM "User"`;
    if (users.length > 0) {
      await newDb.insert(user).values(users).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${users.length} users.\n`);

    // 2. Subscriptions
    console.log("Migrating Subscriptions...");
    const subscriptions = await oldClient<
      Subscription[]
    >`SELECT * FROM "Subscription"`;
    if (subscriptions.length > 0) {
      await newDb
        .insert(subscription)
        .values(subscriptions)
        .onConflictDoNothing();
    }
    console.log(`✓ Migrated ${subscriptions.length} subscriptions.\n`);

    // 3. Payments
    console.log("Migrating Payments...");
    const payments = await oldClient<Payment[]>`SELECT * FROM "Payment"`;
    if (payments.length > 0) {
      await newDb.insert(payment).values(payments).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${payments.length} payments.\n`);

    // 4. Chats
    console.log("Migrating Chats...");
    const chats = await oldClient<Chat[]>`SELECT * FROM "Chat"`;
    if (chats.length > 0) {
      await newDb.insert(chat).values(chats).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${chats.length} chats.\n`);

    // 5. Streams
    console.log("Migrating Streams...");
    const streams = await oldClient<Stream[]>`SELECT * FROM "Stream"`;
    if (streams.length > 0) {
      await newDb.insert(stream).values(streams).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${streams.length} streams.\n`);

    // 6. Deprecated Messages
    console.log("Migrating Deprecated Messages...");
    const messagesOld = await oldClient<
      MessageDeprecated[]
    >`SELECT * FROM "Message"`;
    if (messagesOld.length > 0) {
      await newDb
        .insert(messageDeprecated)
        .values(messagesOld)
        .onConflictDoNothing();
    }
    console.log(`✓ Migrated ${messagesOld.length} deprecated messages.\n`);

    // 7. Messages (v2)
    console.log("Migrating Messages (v2)...");
    const messagesV2 = await oldClient<DBMessage[]>`SELECT * FROM "Message_v2"`;
    if (messagesV2.length > 0) {
      await newDb.insert(message).values(messagesV2).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${messagesV2.length} messages.\n`);

    // 8. Deprecated Votes
    console.log("Migrating Deprecated Votes...");
    const votesOld = await oldClient<VoteDeprecated[]>`SELECT * FROM "Vote"`;
    if (votesOld.length > 0) {
      await newDb.insert(voteDeprecated).values(votesOld).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${votesOld.length} deprecated votes.\n`);

    // 9. Votes (v2)
    console.log("Migrating Votes (v2)...");
    const votesV2 = await oldClient<Vote[]>`SELECT * FROM "Vote_v2"`;
    if (votesV2.length > 0) {
      await newDb.insert(vote).values(votesV2).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${votesV2.length} votes.\n`);

    // 10. Documents
    console.log("Migrating Documents...");
    const documents = await oldClient<Document[]>`SELECT * FROM "Document"`;
    if (documents.length > 0) {
      await newDb.insert(document).values(documents).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${documents.length} documents.\n`);

    // 11. Suggestions
    console.log("Migrating Suggestions...");
    const suggestions = await oldClient<
      Suggestion[]
    >`SELECT * FROM "Suggestion"`;
    if (suggestions.length > 0) {
      await newDb.insert(suggestion).values(suggestions).onConflictDoNothing();
    }
    console.log(`✓ Migrated ${suggestions.length} suggestions.\n`);

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
};

runMigration();
