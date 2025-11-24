-- Drop foreign key constraints
ALTER TABLE "Message_v2" DROP CONSTRAINT IF EXISTS "Message_v2_chatId_Chat_id_fk";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_chatId_Chat_id_fk";
ALTER TABLE "Stream" DROP CONSTRAINT IF EXISTS "Stream_chatId_Chat_id_fk";
ALTER TABLE "Vote_v2" DROP CONSTRAINT IF EXISTS "Vote_v2_chatId_Chat_id_fk";
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_chatId_Chat_id_fk";

-- Convert Chat.id from UUID to TEXT
ALTER TABLE "Chat" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "Chat" ALTER COLUMN "id" DROP DEFAULT;

-- Convert all chatId foreign keys from UUID to TEXT
ALTER TABLE "Message_v2" ALTER COLUMN "chatId" SET DATA TYPE text;
ALTER TABLE "Message" ALTER COLUMN "chatId" SET DATA TYPE text;
ALTER TABLE "Stream" ALTER COLUMN "chatId" SET DATA TYPE text;
ALTER TABLE "Vote_v2" ALTER COLUMN "chatId" SET DATA TYPE text;
ALTER TABLE "Vote" ALTER COLUMN "chatId" SET DATA TYPE text;

-- Recreate foreign key constraints
ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
