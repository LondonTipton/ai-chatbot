-- Fix daily request limits for Free users
-- Set Free users back to 5 daily requests instead of 100

UPDATE "User"
SET "dailyRequestLimit" = '5', "updatedAt" = NOW()
WHERE "plan" = 'Free' AND "dailyRequestLimit" = '100';