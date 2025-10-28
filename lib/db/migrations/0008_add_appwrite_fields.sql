-- Add Appwrite integration fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appwriteId" varchar(64) UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isGuest" boolean DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_user_appwriteId" ON "User"("appwriteId");
CREATE INDEX IF NOT EXISTS "idx_user_isGuest" ON "User"("isGuest");
