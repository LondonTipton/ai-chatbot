#!/usr/bin/env tsx
/**
 * Test script to verify email verification functionality
 * Run with: pnpm tsx scripts/test-email-verification.ts
 */

import { Account, Client, ID } from "node-appwrite";
import { getAppUrl } from "../lib/utils/url";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error("❌ Missing environment variables!");
  console.error("Required:");
  console.error("  - NEXT_PUBLIC_APPWRITE_ENDPOINT");
  console.error("  - NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  console.error("  - APPWRITE_API_KEY");
  process.exit(1);
}

console.log("🔧 Testing Email Verification Setup\n");
console.log("Configuration:");
console.log("  Endpoint:", endpoint);
console.log("  Project ID:", projectId);
console.log("  API Key:", apiKey ? "✓ Set" : "✗ Missing");
console.log("");

async function testEmailVerification() {
  try {
    // Step 1: Create a test user
    console.log("📝 Step 1: Creating test user...");
    const adminClient = new Client()
      .setEndpoint(endpoint!)
      .setProject(projectId!)
      .setKey(apiKey!);

    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = "TestPassword123!";

    console.log("  Email:", testEmail);
    console.log("  Password:", testPassword);

    // Create user account
    const { Users } = await import("node-appwrite");
    const users = new Users(adminClient);
    const userId = ID.unique();

    const user = await users.create(userId, testEmail, undefined, testPassword);
    console.log("  ✅ User created:", user.$id);

    // Step 2: Create a session
    console.log("\n📝 Step 2: Creating session...");
    const sessionClient = new Client()
      .setEndpoint(endpoint!)
      .setProject(projectId!);

    const account = new Account(sessionClient);
    const session = await account.createEmailPasswordSession(
      testEmail,
      testPassword
    );

    console.log("  ✅ Session created:", session.$id);
    console.log("  Session secret length:", session.secret?.length || 0);
    console.log("  Session has secret:", !!session.secret);

    if (!session.secret) {
      console.error("  ❌ ERROR: Session has no secret!");
      return;
    }

    // Step 3: Try to send verification email
    console.log("\n📝 Step 3: Sending verification email...");
    const verificationUrl = `${getAppUrl()}/verify`;
    console.log("  Verification URL:", verificationUrl);

    // Create a new client with the session
    const authenticatedClient = new Client()
      .setEndpoint(endpoint!)
      .setProject(projectId!)
      .setSession(session.secret);

    const authenticatedAccount = new Account(authenticatedClient);

    try {
      const token = await authenticatedAccount.createVerification(
        verificationUrl
      );
      console.log("  ✅ Verification email sent successfully!");
      console.log("  Token ID:", token.$id);
      console.log("  Token expires:", token.expire);
    } catch (verificationError: any) {
      console.error("  ❌ Failed to send verification email!");
      console.error("  Error:", verificationError.message);
      console.error("  Code:", verificationError.code);
      console.error("  Type:", verificationError.type);
    }

    // Step 4: Cleanup - delete test user
    console.log("\n📝 Step 4: Cleaning up...");
    try {
      await users.delete(userId);
      console.log("  ✅ Test user deleted");
    } catch (error) {
      console.error("  ⚠️  Failed to delete test user:", error);
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Test failed!");
    console.error("Error:", error.message);
    console.error("Code:", error.code);
    console.error("Type:", error.type);
    console.error("\nFull error:", error);
  }
}

// Run the test
testEmailVerification();
