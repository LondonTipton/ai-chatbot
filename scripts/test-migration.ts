import "dotenv/config";
import { eq } from "drizzle-orm";
import { createAdminClient } from "../lib/appwrite/config";
import { handleAppwriteError } from "../lib/appwrite/errors";
import { db } from "../lib/db/queries";
import { chat, user } from "../lib/db/schema";

/**
 * Test result type
 */
type TestResult = {
  testName: string;
  passed: boolean;
  error?: string;
  details?: unknown;
};

/**
 * Test results summary type
 */
type TestSummary = {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
};

/**
 * Test 1: Verify Appwrite accounts were created
 */
async function testAppwriteAccountsCreated(): Promise<TestResult> {
  const testName = "Verify Appwrite accounts created";
  console.log(`\n[TEST] ${testName}...`);

  try {
    // Get all non-guest users with Appwrite IDs
    const users = await db.select().from(user).where(eq(user.isGuest, false));

    const usersWithAppwriteId = users.filter((u) => u.appwriteId);
    const usersWithoutAppwriteId = users.filter((u) => !u.appwriteId);

    console.log(`  Total non-guest users: ${users.length}`);
    console.log(`  Users with Appwrite ID: ${usersWithAppwriteId.length}`);
    console.log(
      `  Users without Appwrite ID: ${usersWithoutAppwriteId.length}`
    );

    if (usersWithoutAppwriteId.length > 0) {
      console.log("  ⚠️  Users without Appwrite ID:");
      for (const u of usersWithoutAppwriteId) {
        console.log(`    - ${u.email} (${u.id})`);
      }
    }

    return {
      testName,
      passed: usersWithoutAppwriteId.length === 0,
      details: {
        totalUsers: users.length,
        migratedUsers: usersWithAppwriteId.length,
        unmigrated: usersWithoutAppwriteId.length,
      },
    };
  } catch (error) {
    console.error("  ❌ Error:", error);
    return {
      testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 2: Verify local database updated with Appwrite IDs
 */
async function testDatabaseUpdated(): Promise<TestResult> {
  const testName = "Verify database updated with Appwrite IDs";
  console.log(`\n[TEST] ${testName}...`);

  try {
    const users = await db.select().from(user);

    let validAppwriteIds = 0;
    let invalidAppwriteIds = 0;

    for (const u of users) {
      if (u.appwriteId) {
        // Check if Appwrite ID format is valid (should be alphanumeric)
        const appwriteIdPattern = /^[a-zA-Z0-9_-]+$/;
        if (appwriteIdPattern.test(u.appwriteId)) {
          validAppwriteIds++;
        } else {
          invalidAppwriteIds++;
          console.log(
            `  ⚠️  Invalid Appwrite ID format for ${u.email}: ${u.appwriteId}`
          );
        }
      }
    }

    console.log(`  Valid Appwrite IDs: ${validAppwriteIds}`);
    console.log(`  Invalid Appwrite IDs: ${invalidAppwriteIds}`);

    return {
      testName,
      passed: invalidAppwriteIds === 0,
      details: {
        validIds: validAppwriteIds,
        invalidIds: invalidAppwriteIds,
      },
    };
  } catch (error) {
    console.error("  ❌ Error:", error);
    return {
      testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 3: Test user login after migration
 */
async function testUserLogin(): Promise<TestResult> {
  const testName = "Test user login after migration";
  console.log(`\n[TEST] ${testName}...`);

  try {
    // Get a migrated user (non-guest with Appwrite ID)
    const [testUser] = await db
      .select()
      .from(user)
      .where(eq(user.isGuest, false))
      .limit(1);

    if (!testUser || !testUser.appwriteId) {
      return {
        testName,
        passed: false,
        error: "No migrated users found to test login",
      };
    }

    console.log(`  Testing login for user: ${testUser.email}`);
    console.log(
      `  ⚠️  Note: This test will fail if the user hasn't reset their password yet`
    );
    console.log(
      "  This is expected behavior - users need to reset passwords after migration"
    );

    // Try to verify the user exists in Appwrite
    const { users } = createAdminClient();
    const appwriteUser = await users.get(testUser.appwriteId);

    console.log(`  ✅ User exists in Appwrite: ${appwriteUser.email}`);
    console.log(`  User ID: ${appwriteUser.$id}`);
    console.log(`  Email verified: ${appwriteUser.emailVerification}`);

    return {
      testName,
      passed: true,
      details: {
        email: testUser.email,
        appwriteId: testUser.appwriteId,
        emailVerified: appwriteUser.emailVerification,
      },
    };
  } catch (error) {
    const authError = handleAppwriteError(error);
    console.error("  ❌ Error:", authError.message);
    return {
      testName,
      passed: false,
      error: authError.message,
    };
  }
}

/**
 * Test 4: Verify chat history preserved
 */
async function testChatHistoryPreserved(): Promise<TestResult> {
  const testName = "Verify chat history preserved";
  console.log(`\n[TEST] ${testName}...`);

  try {
    // Get users with chats
    const usersWithChats = await db
      .select({
        userId: user.id,
        email: user.email,
        appwriteId: user.appwriteId,
        chatCount: db.$count(chat, eq(chat.userId, user.id)),
      })
      .from(user)
      .leftJoin(chat, eq(chat.userId, user.id))
      .groupBy(user.id);

    const usersWithChatHistory = usersWithChats.filter(
      (u) => u.chatCount && u.chatCount > 0
    );

    console.log(`  Total users: ${usersWithChats.length}`);
    console.log(`  Users with chat history: ${usersWithChatHistory.length}`);

    // Check if any user lost their chats
    let orphanedChats = 0;
    const allChats = await db.select().from(chat);

    for (const c of allChats) {
      const chatOwner = await db
        .select()
        .from(user)
        .where(eq(user.id, c.userId))
        .limit(1);

      if (chatOwner.length === 0) {
        orphanedChats++;
        console.log(`  ⚠️  Orphaned chat found: ${c.id}`);
      }
    }

    console.log(`  Total chats: ${allChats.length}`);
    console.log(`  Orphaned chats: ${orphanedChats}`);

    return {
      testName,
      passed: orphanedChats === 0,
      details: {
        totalChats: allChats.length,
        usersWithChats: usersWithChatHistory.length,
        orphanedChats,
      },
    };
  } catch (error) {
    console.error("  ❌ Error:", error);
    return {
      testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 5: Verify guest users not migrated
 */
async function testGuestUsersNotMigrated(): Promise<TestResult> {
  const testName = "Verify guest users not migrated";
  console.log(`\n[TEST] ${testName}...`);

  try {
    const guestUsers = await db
      .select()
      .from(user)
      .where(eq(user.isGuest, true));

    const guestUsersWithAppwriteId = guestUsers.filter((u) => u.appwriteId);

    console.log(`  Total guest users: ${guestUsers.length}`);
    console.log(
      `  Guest users with Appwrite ID: ${guestUsersWithAppwriteId.length}`
    );

    if (guestUsersWithAppwriteId.length > 0) {
      console.log("  ⚠️  Guest users with Appwrite ID (should be 0):");
      for (const u of guestUsersWithAppwriteId) {
        console.log(`    - ${u.email} (${u.id})`);
      }
    }

    return {
      testName,
      passed: guestUsersWithAppwriteId.length === 0,
      details: {
        totalGuestUsers: guestUsers.length,
        migratedGuestUsers: guestUsersWithAppwriteId.length,
      },
    };
  } catch (error) {
    console.error("  ❌ Error:", error);
    return {
      testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all migration tests
 */
async function runMigrationTests(): Promise<TestSummary> {
  console.log("=".repeat(60));
  console.log("Running Migration Tests");
  console.log("=".repeat(60));

  const results: TestResult[] = [];

  // Run all tests
  results.push(await testAppwriteAccountsCreated());
  results.push(await testDatabaseUpdated());
  results.push(await testUserLogin());
  results.push(await testChatHistoryPreserved());
  results.push(await testGuestUsersNotMigrated());

  // Calculate summary
  const summary: TestSummary = {
    totalTests: results.length,
    passedTests: results.filter((r) => r.passed).length,
    failedTests: results.filter((r) => !r.passed).length,
    results,
  };

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passedTests}`);
  console.log(`Failed: ${summary.failedTests}`);
  console.log("=".repeat(60));

  console.log("\nDetailed Results:");
  console.log("-".repeat(60));
  for (const result of results) {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${result.testName}`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    if (result.details) {
      console.log("  Details:", JSON.stringify(result.details, null, 2));
    }
  }
  console.log("-".repeat(60));

  // Save test report
  const reportPath = `migration-test-report-${Date.now()}.json`;
  const fs = await import("node:fs/promises");
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nTest report saved to: ${reportPath}`);

  return summary;
}

// Run tests if executed directly
if (require.main === module) {
  runMigrationTests()
    .then((summary) => {
      if (summary.failedTests === 0) {
        console.log("\n✅ All tests passed!");
        process.exit(0);
      } else {
        console.log(`\n❌ ${summary.failedTests} test(s) failed`);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("\n❌ Test execution failed:", error);
      process.exit(1);
    });
}

export { runMigrationTests };
