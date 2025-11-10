ALTER TABLE "User" ALTER COLUMN "dailyRequestLimit" SET DEFAULT '5';

-- Update existing Free users from 100 to 5
UPDATE "User"
SET "dailyRequestLimit" = '5', "updatedAt" = NOW()
WHERE "plan" = 'Free' AND "dailyRequestLimit" = '100';