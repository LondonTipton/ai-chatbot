-- Add plan and usage tracking columns to User table
ALTER TABLE "User" ADD COLUMN "plan" varchar DEFAULT 'Free' NOT NULL;
ALTER TABLE "User" ADD COLUMN "requestsToday" varchar(10) DEFAULT '0' NOT NULL;
ALTER TABLE "User" ADD COLUMN "dailyRequestLimit" varchar(10) DEFAULT '5' NOT NULL;
ALTER TABLE "User" ADD COLUMN "lastRequestReset" timestamp DEFAULT NOW() NOT NULL;

-- Add check constraint for plan enum
ALTER TABLE "User" ADD CONSTRAINT "User_plan_check" 
  CHECK ("plan" IN ('Free', 'Basic', 'Pro', 'Pro+', 'Ultra'));
