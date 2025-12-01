import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const runFix = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const sql = postgres(process.env.POSTGRES_URL);

  console.log("Fixing schema manually...");

  try {
    // Drop foreign key constraints first
    console.log("Dropping constraints...");
    await sql`ALTER TABLE "Vote_v2" DROP CONSTRAINT IF EXISTS "Vote_v2_messageId_Message_v2_id_fk"`;
    await sql`ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_messageId_Message_id_fk"`;

    // Convert Message_v2.id
    console.log("Converting Message_v2.id to text...");
    await sql`ALTER TABLE "Message_v2" ALTER COLUMN "id" SET DATA TYPE text`;
    await sql`ALTER TABLE "Message_v2" ALTER COLUMN "id" DROP DEFAULT`;

    // Convert Message.id
    console.log("Converting Message.id to text...");
    await sql`ALTER TABLE "Message" ALTER COLUMN "id" SET DATA TYPE text`;
    await sql`ALTER TABLE "Message" ALTER COLUMN "id" DROP DEFAULT`;

    // Convert Vote_v2.messageId
    console.log("Converting Vote_v2.messageId to text...");
    await sql`ALTER TABLE "Vote_v2" ALTER COLUMN "messageId" SET DATA TYPE text`;

    // Convert Vote.messageId
    console.log("Converting Vote.messageId to text...");
    await sql`ALTER TABLE "Vote" ALTER COLUMN "messageId" SET DATA TYPE text`;

    // Convert Stream.id
    console.log("Converting Stream.id to text...");
    await sql`ALTER TABLE "Stream" ALTER COLUMN "id" SET DATA TYPE text`;
    await sql`ALTER TABLE "Stream" ALTER COLUMN "id" DROP DEFAULT`;

    // Recreate constraints
    console.log("Recreating constraints...");
    await sql`ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`;
    await sql`ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`;

    console.log("✅ Schema fixed successfully.");
  } catch (error) {
    console.error("❌ Failed to fix schema:", error);
  } finally {
    await sql.end();
  }
};

runFix().catch(console.error);
