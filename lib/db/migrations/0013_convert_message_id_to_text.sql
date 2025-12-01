-- Drop foreign key constraints
ALTER TABLE "Vote_v2" DROP CONSTRAINT IF EXISTS "Vote_v2_messageId_Message_v2_id_fk";
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_messageId_Message_id_fk";

-- Convert Message_v2.id from UUID to TEXT
ALTER TABLE "Message_v2" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "Message_v2" ALTER COLUMN "id" DROP DEFAULT;

-- Convert Message.id from UUID to TEXT
ALTER TABLE "Message" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "Message" ALTER COLUMN "id" DROP DEFAULT;

-- Convert Vote_v2.messageId from UUID to TEXT
ALTER TABLE "Vote_v2" ALTER COLUMN "messageId" SET DATA TYPE text;

-- Convert Vote.messageId from UUID to TEXT
ALTER TABLE "Vote" ALTER COLUMN "messageId" SET DATA TYPE text;

-- Recreate foreign key constraints
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
