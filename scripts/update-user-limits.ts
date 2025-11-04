/**
 * Script to update existing users' daily request limits
 * Run with: npx tsx scripts/update-user-limits.ts
 */

import { sql } from "drizzle-orm";
import { db } from "../lib/db/queries";
import { user } from "../lib/db/schema";

async function updateUserLimits() {
  console.log("🔄 Updating user daily request limits...");

  try {
    // Update all users with the old default (5) to the new default (100)
    const result = await db
      .update(user)
      .set({
        dailyRequestLimit: "100",
        updatedAt: new Date(),
      })
      .where(sql`${user.dailyRequestLimit} = '5'`);

    console.log("✅ Updated users with limit of 5 to 100");

    // Also reset today's count for users who hit the limit
    const resetResult = await db
      .update(user)
      .set({
        requestsToday: "0",
        lastRequestReset: new Date(),
        updatedAt: new Date(),
      })
      .where(
        sql`CAST(${user.requestsToday} AS INTEGER) >= CAST(${user.dailyRequestLimit} AS INTEGER)`
      );

    console.log("✅ Reset request counts for users who hit their limit");

    console.log("\n📊 Summary:");
    console.log("- Default limit changed from 5 to 100 requests/day");
    console.log("- Existing users updated");
    console.log("- Request counts reset for affected users");
    console.log("\n✨ All users can now make up to 100 requests per day!");
  } catch (error) {
    console.error("❌ Error updating user limits:", error);
    throw error;
  }
}

// Run the update
updateUserLimits()
  .then(() => {
    console.log("\n✅ Update complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Update failed:", error);
    process.exit(1);
  });
