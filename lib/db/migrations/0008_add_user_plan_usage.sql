-- Add plan and usage tracking columns to User table (only if they don't exist)
DO $$ 
BEGIN
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

-- Add check constraint for plan enum (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_plan_check') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_plan_check" 
          CHECK ("plan" IN ('Free', 'Basic', 'Pro', 'Pro+', 'Ultra'));
    END IF;
END $$;
