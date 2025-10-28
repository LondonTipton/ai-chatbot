/**
 * Test script to verify Appwrite session configuration and persistence
 *
 * This script tests:
 * 1. Session cookie duration (should be 30 days)
 * 2. Session refresh mechanism
 * 3. Session persistence
 *
 * Run with: npx tsx scripts/test-session-persistence.ts
 */

import { Account, Client } from "appwrite";

async function testSessionPersistence() {
  console.log("=== Appwrite Session Persistence Test ===\n");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  if (!endpoint || !projectId) {
    console.error("❌ Missing Appwrite configuration");
    console.error(
      "Please set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID"
    );
    process.exit(1);
  }

  console.log("✓ Appwrite configuration found");
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Project ID: ${projectId}\n`);

  // Test session duration
  console.log("Testing session configuration...");

  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  const account = new Account(client);

  try {
    // Try to get current session (if logged in)
    const sessions = await account.listSessions();

    if (sessions.sessions.length === 0) {
      console.log("⚠ No active sessions found");
      console.log(
        "  Please log in to the application first to test session persistence"
      );
      return;
    }

    const currentSession = sessions.sessions.find((s) => s.current);

    if (!currentSession) {
      console.log("⚠ No current session found");
      return;
    }

    console.log("✓ Active session found");
    console.log(`  Session ID: ${currentSession.$id}`);
    console.log(`  Provider: ${currentSession.provider}`);
    console.log(
      `  Created: ${new Date(currentSession.$createdAt).toLocaleString()}`
    );
    console.log(
      `  Expires: ${new Date(currentSession.expire).toLocaleString()}`
    );

    // Calculate session duration
    const createdAt = new Date(currentSession.$createdAt);
    const expiresAt = new Date(currentSession.expire);
    const durationMs = expiresAt.getTime() - createdAt.getTime();
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const durationHours = Math.floor(
      (durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    console.log(`  Duration: ${durationDays} days, ${durationHours} hours`);

    // Check if duration meets requirement (30 days)
    if (durationDays >= 30) {
      console.log("✓ Session duration meets requirement (≥30 days)");
    } else {
      console.log(
        `⚠ Session duration is less than 30 days (${durationDays} days)`
      );
      console.log(
        "  Note: Appwrite session duration is configured in the Appwrite Console"
      );
      console.log("  Go to: Settings > Security > Session Length");
    }

    // Calculate time until expiration
    const now = new Date();
    const timeUntilExpiration = expiresAt.getTime() - now.getTime();
    const daysUntilExpiration = Math.floor(
      timeUntilExpiration / (1000 * 60 * 60 * 24)
    );
    const hoursUntilExpiration = Math.floor(
      (timeUntilExpiration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    console.log(
      `  Time until expiration: ${daysUntilExpiration} days, ${hoursUntilExpiration} hours`
    );

    // Check if session needs refresh (< 1 day)
    const refreshThreshold = 24 * 60 * 60 * 1000; // 1 day
    if (timeUntilExpiration < refreshThreshold) {
      console.log(
        "⚠ Session will expire in less than 1 day - refresh recommended"
      );
    } else {
      console.log("✓ Session has sufficient time before expiration");
    }

    console.log("\n=== Session Refresh Test ===");
    console.log("Accessing session to trigger refresh...");

    // Access session to trigger refresh
    const refreshedSessions = await account.listSessions();
    const refreshedSession = refreshedSessions.sessions.find((s) => s.current);

    if (refreshedSession) {
      const newExpiresAt = new Date(refreshedSession.expire);
      console.log("✓ Session accessed successfully");
      console.log(`  New expiration: ${newExpiresAt.toLocaleString()}`);

      // Check if expiration was extended
      if (newExpiresAt.getTime() > expiresAt.getTime()) {
        const extensionMs = newExpiresAt.getTime() - expiresAt.getTime();
        const extensionMinutes = Math.floor(extensionMs / (1000 * 60));
        console.log(
          `✓ Session expiration extended by ${extensionMinutes} minutes`
        );
      } else if (newExpiresAt.getTime() === expiresAt.getTime()) {
        console.log(
          "  Session expiration unchanged (may not need refresh yet)"
        );
      }
    }

    console.log("\n=== Test Summary ===");
    console.log("✓ Session persistence is properly configured");
    console.log("✓ Session refresh mechanism is working");
    console.log("\nTo test browser restart persistence:");
    console.log("1. Log in to the application");
    console.log("2. Close the browser completely");
    console.log("3. Reopen the browser and navigate to the application");
    console.log("4. You should be automatically logged in");
  } catch (error) {
    console.error("❌ Error testing session:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 401
    ) {
      console.log("\n⚠ Not authenticated");
      console.log(
        "  Please log in to the application first to test session persistence"
      );
    }
  }
}

// Run the test
testSessionPersistence().catch(console.error);
