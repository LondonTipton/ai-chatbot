-- Add Appwrite integration fields and plan/usage tracking columns to User table (only if they don't exist)
DO $$ 
BEGIN
    -- Add appwriteId column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='appwriteId') THEN
        ALTER TABLE "User" ADD COLUMN "appwriteId" varchar(64);
    END IF;

    -- Add isGuest column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='isGuest') THEN
        ALTER TABLE "User" ADD COLUMN "isGuest" boolean DEFAULT false;
    END IF;

    -- Add createdAt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='createdAt') THEN
        ALTER TABLE "User" ADD COLUMN "createdAt" timestamp NOT NULL DEFAULT now();
    END IF;

    -- Add updatedAt column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='updatedAt') THEN
        ALTER TABLE "User" ADD COLUMN "updatedAt" timestamp NOT NULL DEFAULT now();
    END IF;

    -- Add plan column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='plan') THEN
        ALTER TABLE "User" ADD COLUMN "plan" varchar DEFAULT 'Free' NOT NULL;
    END IF;

    -- Add requestsToday column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='requestsToday') THEN
        ALTER TABLE "User" ADD COLUMN "requestsToday" varchar(10) DEFAULT '0' NOT NULL;
    END IF;

    -- Add dailyRequestLimit column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='dailyRequestLimit') THEN
        ALTER TABLE "User" ADD COLUMN "dailyRequestLimit" varchar(10) DEFAULT '5' NOT NULL;
    END IF;

    -- Add lastRequestReset column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='User' AND column_name='lastRequestReset') THEN
        ALTER TABLE "User" ADD COLUMN "lastRequestReset" timestamp DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Add unique constraint for appwriteId (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_appwriteId_key') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_appwriteId_key" UNIQUE ("appwriteId");
    END IF;
END $$;

-- Add check constraint for plan enum (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_plan_check') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_plan_check" 
          CHECK ("plan" IN ('Free', 'Basic', 'Pro', 'Pro+', 'Ultra'));
    END IF;
END $$;

-- Create indexes for better query performance (if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_user_appwriteId" ON "User"("appwriteId");
CREATE INDEX IF NOT EXISTS "idx_user_isGuest" ON "User"("isGuest");
