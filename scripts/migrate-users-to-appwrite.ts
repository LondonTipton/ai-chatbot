import "dotenv/config";
import { eq } from "drizzle-orm";
import { ID } from "node-appwrite";
import { createAdminClient } from "../lib/appwrite/config";
import { handleAppwriteError } from "../lib/appwrite/errors";
import { db } from "../lib/db/queries";
import { user } from "../lib/db/schema";

/**
 * Migration result type
 */
type MigrationResult = {
  totalUsers: number;
  migratedUsers: number;
  failedUsers: number;
  skippedUsers: number;
  errors: Array<{ userId: string; email: string; error: string }>;
};

/**
 * Generate a secure temporary password
 */
function generateTemporaryPassword(): string {
  const length = 16;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Migrate a single user to Appwrite
 */
async function migrateUser(
  userId: string,
  email: string,
  isGuest: boolean
): Promise<{ success: boolean; appwriteId?: string; error?: string }> {
  try {
    const { users } = createAdminClient();

    // Skip guest users - they should be handled separately
    if (isGuest) {
      console.log(`[SKIP] User ${email} is a guest user, skipping migration`);
      return { success: false, error: "Guest user - skipped" };
    }

    // Generate temporary password for the user
    const tempPassword = generateTemporaryPassword();

    // Create Appwrite account
    const appwriteUserId = ID.unique();
    console.log(`[MIGRATE] Creating Appwrite account for ${email}...`);

    await users.create(appwriteUserId, email, undefined, tempPassword);

    console.log(
      `[MIGRATE] Appwrite account created with ID: ${appwriteUserId}`
    );

    // Update local database with Appwrite ID
    await db
      .update(user)
      .set({
        appwriteId: appwriteUserId,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    console.log(`[MIGRATE] Database updated for user ${email}`);

    return { success: true, appwriteId: appwriteUserId };
  } catch (error) {
    const authError = handleAppwriteError(error);
    console.error(`[ERROR] Failed to migrate user ${email}:`, authError);
    return { success: false, error: authError.message };
  }
}

/**
 * Main migration function
 */
async function migrateUsersToAppwrite(): Promise<MigrationResult> {
  console.log("=".repeat(60));
  console.log("Starting User Migration to Appwrite");
  console.log("=".repeat(60));

  const result: MigrationResult = {
    totalUsers: 0,
    migratedUsers: 0,
    failedUsers: 0,
    skippedUsers: 0,
    errors: [],
  };

  try {
    // Fetch all users from local database
    console.log("\n[FETCH] Fetching users from database...");
    const users = await db.select().from(user);

    result.totalUsers = users.length;
    console.log(`[FETCH] Found ${result.totalUsers} users to process\n`);

    // Migrate each user
    for (const currentUser of users) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Processing user: ${currentUser.email}`);
      console.log(`User ID: ${currentUser.id}`);
      console.log(`Is Guest: ${currentUser.isGuest}`);
      console.log(`Has Appwrite ID: ${!!currentUser.appwriteId}`);
      console.log(`${"=".repeat(60)}`);

      // Skip if already migrated
      if (currentUser.appwriteId) {
        console.log(
          `[SKIP] User ${currentUser.email} already has Appwrite ID: ${currentUser.appwriteId}`
        );
        result.skippedUsers++;
        continue;
      }

      // Migrate user
      const migrationResult = await migrateUser(
        currentUser.id,
        currentUser.email,
        currentUser.isGuest || false
      );

      if (migrationResult.success) {
        result.migratedUsers++;
        console.log(
          `[SUCCESS] User ${currentUser.email} migrated successfully`
        );
      } else if (migrationResult.error === "Guest user - skipped") {
        result.skippedUsers++;
      } else {
        result.failedUsers++;
        result.errors.push({
          userId: currentUser.id,
          email: currentUser.email,
          error: migrationResult.error || "Unknown error",
        });
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Generate migration report
    console.log(`\n${"=".repeat(60)}`);
    console.log("Migration Complete");
    console.log("=".repeat(60));
    console.log(`Total Users: ${result.totalUsers}`);
    console.log(`Successfully Migrated: ${result.migratedUsers}`);
    console.log(`Failed: ${result.failedUsers}`);
    console.log(`Skipped: ${result.skippedUsers}`);
    console.log("=".repeat(60));

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      console.log("-".repeat(60));
      for (const error of result.errors) {
        console.log(`User: ${error.email} (${error.userId})`);
        console.log(`Error: ${error.error}`);
        console.log("-".repeat(60));
      }
    }

    // Save migration report to file
    const reportPath = `migration-report-${Date.now()}.json`;
    const fs = await import("node:fs/promises");
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    console.log(`\nMigration report saved to: ${reportPath}`);

    return result;
  } catch (error) {
    console.error("\n[FATAL] Migration failed with error:", error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateUsersToAppwrite()
    .then((result) => {
      console.log("\n✅ Migration completed successfully");
      process.exit(result.failedUsers > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("\n❌ Migration failed:", error);
      process.exit(1);
    });
}

export { migrateUsersToAppwrite };
