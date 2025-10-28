import "dotenv/config";
import { isNotNull } from "drizzle-orm";
import { createAdminClient } from "../lib/appwrite/config";
import { handleAppwriteError } from "../lib/appwrite/errors";
import { db } from "../lib/db/queries";
import { user } from "../lib/db/schema";

/**
 * Notification result type
 */
type NotificationResult = {
  totalUsers: number;
  sentNotifications: number;
  failedNotifications: number;
  skippedUsers: number;
  errors: Array<{ email: string; error: string }>;
};

/**
 * Send password reset notification to a single user
 */
async function sendPasswordResetNotification(
  email: string,
  isGuest: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Skip guest users
    if (isGuest) {
      console.log(
        `[SKIP] User ${email} is a guest user, skipping notification`
      );
      return { success: false, error: "Guest user - skipped" };
    }

    const { account } = createAdminClient();

    // Use Appwrite's password recovery feature
    // This will send an email with a password reset link
    console.log(`[SEND] Sending password reset email to ${email}...`);

    // Get the redirect URL from environment or use default
    const redirectUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${redirectUrl}/reset-password`;

    await account.createRecovery(email, resetUrl);

    console.log(`[SUCCESS] Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    const authError = handleAppwriteError(error);
    console.error(
      `[ERROR] Failed to send password reset to ${email}:`,
      authError
    );
    return { success: false, error: authError.message };
  }
}

/**
 * Main function to send password reset notifications to all migrated users
 */
async function sendPasswordResetNotifications(): Promise<NotificationResult> {
  console.log("=".repeat(60));
  console.log("Sending Password Reset Notifications");
  console.log("=".repeat(60));

  const result: NotificationResult = {
    totalUsers: 0,
    sentNotifications: 0,
    failedNotifications: 0,
    skippedUsers: 0,
    errors: [],
  };

  try {
    // Fetch all users with Appwrite IDs (migrated users)
    console.log("\n[FETCH] Fetching migrated users from database...");
    const users = await db
      .select()
      .from(user)
      .where(isNotNull(user.appwriteId));

    result.totalUsers = users.length;
    console.log(`[FETCH] Found ${result.totalUsers} migrated users\n`);

    // Send notification to each user
    for (const currentUser of users) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Processing user: ${currentUser.email}`);
      console.log(`User ID: ${currentUser.id}`);
      console.log(`Appwrite ID: ${currentUser.appwriteId}`);
      console.log(`Is Guest: ${currentUser.isGuest}`);
      console.log(`${"=".repeat(60)}`);

      // Send password reset notification
      const notificationResult = await sendPasswordResetNotification(
        currentUser.email,
        currentUser.isGuest || false
      );

      if (notificationResult.success) {
        result.sentNotifications++;
        console.log(
          `[SUCCESS] Password reset notification sent to ${currentUser.email}`
        );
      } else if (notificationResult.error === "Guest user - skipped") {
        result.skippedUsers++;
      } else {
        result.failedNotifications++;
        result.errors.push({
          email: currentUser.email,
          error: notificationResult.error || "Unknown error",
        });
      }

      // Add a delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Generate notification report
    console.log(`\n${"=".repeat(60)}`);
    console.log("Notification Process Complete");
    console.log("=".repeat(60));
    console.log(`Total Users: ${result.totalUsers}`);
    console.log(`Successfully Sent: ${result.sentNotifications}`);
    console.log(`Failed: ${result.failedNotifications}`);
    console.log(`Skipped: ${result.skippedUsers}`);
    console.log("=".repeat(60));

    if (result.errors.length > 0) {
      console.log("\nErrors:");
      console.log("-".repeat(60));
      for (const error of result.errors) {
        console.log(`User: ${error.email}`);
        console.log(`Error: ${error.error}`);
        console.log("-".repeat(60));
      }
    }

    // Save notification report to file
    const reportPath = `password-reset-report-${Date.now()}.json`;
    const fs = await import("node:fs/promises");
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    console.log(`\nNotification report saved to: ${reportPath}`);

    return result;
  } catch (error) {
    console.error("\n[FATAL] Notification process failed with error:", error);
    throw error;
  }
}

// Run notification process if executed directly
if (require.main === module) {
  sendPasswordResetNotifications()
    .then((result) => {
      console.log("\n✅ Password reset notifications sent successfully");
      process.exit(result.failedNotifications > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("\n❌ Notification process failed:", error);
      process.exit(1);
    });
}

export { sendPasswordResetNotifications };
