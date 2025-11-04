import { expect, test } from "@playwright/test";

// Helper to generate unique IDs
function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

test.describe("Usage Transaction Manager", () => {
  let testUserId: string;
  let testEmail: string;

  test.beforeAll(async () => {
    testUserId = generateTestId();
    testEmail = `test-${testUserId}@example.com`;

    // Create test user
    const { db } = await import("@/lib/db/queries");
    const { user } = await import("@/lib/db/schema");

    await db.insert(user).values({
      id: testUserId,
      email: testEmail,
      plan: "Free",
      dailyRequestLimit: "5",
      requestsToday: "0",
      lastRequestReset: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  test.afterAll(async () => {
    try {
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db.delete(user).where(eq(user.id, testUserId));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test.beforeEach(async () => {
    // Reset user usage
    const { db } = await import("@/lib/db/queries");
    const { user } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    await db
      .update(user)
      .set({
        requestsToday: "0",
        lastRequestReset: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(user.id, testUserId));

    const { forceCleanup } = await import("@/lib/db/usage-transaction");
    forceCleanup();
  });

  test.describe("beginTransaction", () => {
    test("should create transaction when user has quota available", async () => {
      const { beginTransaction } = await import("@/lib/db/usage-transaction");
      const result = await beginTransaction(testUserId);

      expect(result.allowed).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.userId).toBe(testUserId);
      expect(result.transaction?.transactionId).toBeDefined();
      expect(result.transaction?.committed).toBe(false);
      expect(result.transaction?.rolledBack).toBe(false);
      expect(result.currentUsage.allowed).toBe(true);
      expect(result.currentUsage.requestsToday).toBe(0);
      expect(result.currentUsage.dailyLimit).toBe(5);
    });

    test("should deny transaction when user has reached daily limit", async () => {
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(user)
        .set({
          requestsToday: "5",
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUserId));

      const { beginTransaction } = await import("@/lib/db/usage-transaction");
      const result = await beginTransaction(testUserId);

      expect(result.allowed).toBe(false);
      expect(result.transaction).toBeUndefined();
      expect(result.currentUsage.allowed).toBe(false);
      expect(result.currentUsage.reason).toBe("daily_limit_reached");
    });

    test("should deny transaction for non-existent user", async () => {
      const { beginTransaction } = await import("@/lib/db/usage-transaction");
      const result = await beginTransaction("non-existent-user-id");

      expect(result.allowed).toBe(false);
      expect(result.transaction).toBeUndefined();
      expect(result.currentUsage.reason).toBe("user_not_found");
    });

    test("should reset counter for new day", async () => {
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db
        .update(user)
        .set({
          requestsToday: "3",
          lastRequestReset: yesterday,
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUserId));

      const { beginTransaction } = await import("@/lib/db/usage-transaction");
      const result = await beginTransaction(testUserId);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage.requestsToday).toBe(0);
    });
  });

  test.describe("commitTransaction", () => {
    test("should increment usage counter on commit", async () => {
      const { beginTransaction, commitTransaction } = await import(
        "@/lib/db/usage-transaction"
      );

      const beginResult = await beginTransaction(testUserId);
      expect(beginResult.allowed).toBe(true);
      const txId = beginResult.transaction!.transactionId;

      const commitResult = await commitTransaction(txId);

      expect(commitResult.success).toBe(true);
      expect(commitResult.newUsage.requestsToday).toBe(1);
      expect(commitResult.newUsage.allowed).toBe(true);

      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("1");
    });

    test("should fail to commit non-existent transaction", async () => {
      const { commitTransaction } = await import("@/lib/db/usage-transaction");
      const commitResult = await commitTransaction("non-existent-tx-id");

      expect(commitResult.success).toBe(false);
      expect(commitResult.error).toBe("transaction_not_found");
    });

    test("should handle double commit gracefully", async () => {
      const { beginTransaction, commitTransaction } = await import(
        "@/lib/db/usage-transaction"
      );

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId);

      const secondCommit = await commitTransaction(txId);
      expect(secondCommit.success).toBe(true);
    });

    test("should fail to commit rolled back transaction", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await rollbackTransaction(txId);

      const commitResult = await commitTransaction(txId);

      expect(commitResult.success).toBe(false);
      expect(commitResult.error).toBe("transaction_rolled_back");
    });
  });

  test.describe("rollbackTransaction", () => {
    test("should rollback uncommitted transaction without DB change", async () => {
      const { beginTransaction, rollbackTransaction } = await import(
        "@/lib/db/usage-transaction"
      );

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;

      const rollbackResult = await rollbackTransaction(txId);
      expect(rollbackResult.success).toBe(true);

      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("0");
    });

    test("should decrement counter when rolling back committed transaction", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId);

      let [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("1");

      const rollbackResult = await rollbackTransaction(txId);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.currentUsage.requestsToday).toBe(0);

      [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("0");
    });

    test("should handle double rollback gracefully", async () => {
      const { beginTransaction, rollbackTransaction } = await import(
        "@/lib/db/usage-transaction"
      );

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;

      await rollbackTransaction(txId);
      const secondRollback = await rollbackTransaction(txId);

      expect(secondRollback.success).toBe(true);
    });

    test("should not decrement below zero", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId);
      await rollbackTransaction(txId);

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("0");
    });

    test("should ensure user has at least 1 request available when rolling back from limit", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      // Set user to be at their limit (5/5)
      await db
        .update(user)
        .set({
          requestsToday: "5",
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUserId));

      // Begin a transaction (this would normally be denied, but let's test rollback logic)
      // First, we need to commit a transaction to test rollback from limit
      // So let's set to 4, commit to get to 5, then rollback
      await db
        .update(user)
        .set({
          requestsToday: "4",
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUserId));

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId); // Now at 5/5

      let [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("5");

      // Rollback should restore to 4 (allowing 1 more request)
      const rollbackResult = await rollbackTransaction(txId);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.currentUsage.requestsToday).toBe(4);
      expect(rollbackResult.currentUsage.allowed).toBe(true);

      [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("4");
    });

    test("should log rollback operations with user ID and reason", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId);

      // Capture console logs
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        consoleLogs.push(args.join(" "));
        originalLog(...args);
      };

      await rollbackTransaction(txId);

      console.log = originalLog;

      // Verify logging includes user ID and rollback reason
      const rollbackLog = consoleLogs.find((log) =>
        log.includes("Rolled back transaction")
      );
      expect(rollbackLog).toBeDefined();
      expect(rollbackLog).toContain(testUserId);
      expect(rollbackLog).toContain(txId);

      const reasonLog = consoleLogs.find((log) =>
        log.includes("Rollback reason")
      );
      expect(reasonLog).toBeDefined();
      expect(reasonLog).toContain("All retry attempts exhausted");
    });

    test("should verify rollback success", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId);

      const rollbackResult = await rollbackTransaction(txId);

      // Verify the result indicates success
      expect(rollbackResult.success).toBe(true);

      // Verify the database was actually updated
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("0");

      // Verify the returned usage matches database
      expect(rollbackResult.currentUsage.requestsToday).toBe(0);
    });

    test("should log critical error when rollback fails", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;
      await commitTransaction(txId);

      // Delete user to simulate rollback failure
      await db.delete(user).where(eq(user.id, testUserId));

      // Capture console errors
      const consoleErrors: string[] = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        consoleErrors.push(args.join(" "));
        originalError(...args);
      };

      const rollbackResult = await rollbackTransaction(txId);

      console.error = originalError;

      // Verify rollback failed
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.error).toBe("user_not_found");

      // Verify critical error was logged
      const criticalLog = consoleErrors.find((log) => log.includes("CRITICAL"));
      expect(criticalLog).toBeDefined();
      expect(criticalLog).toContain(txId);

      // Recreate user for other tests
      await db.insert(user).values({
        id: testUserId,
        email: testEmail,
        plan: "Free",
        dailyRequestLimit: "5",
        requestsToday: "0",
        lastRequestReset: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });

  test.describe("transaction lifecycle", () => {
    test("should complete full lifecycle: begin → commit", async () => {
      const { beginTransaction, commitTransaction, getTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      expect(beginResult.allowed).toBe(true);
      const txId = beginResult.transaction!.transactionId;

      const tx = getTransaction(txId);
      expect(tx).toBeDefined();
      expect(tx?.committed).toBe(false);
      expect(tx?.rolledBack).toBe(false);

      const commitResult = await commitTransaction(txId);
      expect(commitResult.success).toBe(true);

      const committedTx = getTransaction(txId);
      expect(committedTx?.committed).toBe(true);
      expect(committedTx?.rolledBack).toBe(false);

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("1");
    });

    test("should complete full lifecycle: begin → rollback", async () => {
      const { beginTransaction, rollbackTransaction, getTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      expect(beginResult.allowed).toBe(true);
      const txId = beginResult.transaction!.transactionId;

      const rollbackResult = await rollbackTransaction(txId);
      expect(rollbackResult.success).toBe(true);

      const rolledBackTx = getTransaction(txId);
      expect(rolledBackTx?.committed).toBe(false);
      expect(rolledBackTx?.rolledBack).toBe(true);

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("0");
    });
  });

  test.describe("concurrent transactions", () => {
    test("should handle multiple transactions for same user", async () => {
      const { beginTransaction, commitTransaction } = await import(
        "@/lib/db/usage-transaction"
      );
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const tx1 = await beginTransaction(testUserId);
      const tx2 = await beginTransaction(testUserId);
      const tx3 = await beginTransaction(testUserId);

      expect(tx1.allowed).toBe(true);
      expect(tx2.allowed).toBe(true);
      expect(tx3.allowed).toBe(true);

      expect(tx1.transaction!.transactionId).not.toBe(
        tx2.transaction!.transactionId
      );
      expect(tx2.transaction!.transactionId).not.toBe(
        tx3.transaction!.transactionId
      );

      await commitTransaction(tx1.transaction!.transactionId);
      await commitTransaction(tx2.transaction!.transactionId);
      await commitTransaction(tx3.transaction!.transactionId);

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("3");
    });

    test("should handle mixed commit and rollback", async () => {
      const { beginTransaction, commitTransaction, rollbackTransaction } =
        await import("@/lib/db/usage-transaction");
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const tx1 = await beginTransaction(testUserId);
      const tx2 = await beginTransaction(testUserId);
      const tx3 = await beginTransaction(testUserId);

      await commitTransaction(tx1.transaction!.transactionId);
      await rollbackTransaction(tx2.transaction!.transactionId);
      await commitTransaction(tx3.transaction!.transactionId);

      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, testUserId));
      expect(userRecord.requestsToday).toBe("2");
    });
  });

  test.describe("transaction expiration", () => {
    test("should track active transactions", async () => {
      const { beginTransaction, commitTransaction, getActiveTransactions } =
        await import("@/lib/db/usage-transaction");

      const initialCount = getActiveTransactions().length;

      const beginResult = await beginTransaction(testUserId);
      expect(beginResult.allowed).toBe(true);

      const activeTransactions = getActiveTransactions();
      expect(activeTransactions.length).toBe(initialCount + 1);

      await commitTransaction(beginResult.transaction!.transactionId);

      const afterCommit = getActiveTransactions();
      expect(afterCommit.length).toBeGreaterThanOrEqual(initialCount);
    });

    test("should cleanup transactions after commit", async () => {
      const {
        beginTransaction,
        commitTransaction,
        forceCleanup,
        getTransaction,
      } = await import("@/lib/db/usage-transaction");

      const beginResult = await beginTransaction(testUserId);
      await commitTransaction(beginResult.transaction!.transactionId);

      forceCleanup();

      const tx = getTransaction(beginResult.transaction!.transactionId);
      expect(tx).toBeDefined();
    });
  });

  test.describe("error handling", () => {
    test("should handle database errors gracefully in beginTransaction", async () => {
      const { beginTransaction } = await import("@/lib/db/usage-transaction");
      const result = await beginTransaction("");

      expect(result.allowed).toBe(false);
      expect(result.currentUsage.reason).toBeDefined();
    });

    test("should handle database errors gracefully in commitTransaction", async () => {
      const { beginTransaction, commitTransaction } = await import(
        "@/lib/db/usage-transaction"
      );
      const { db } = await import("@/lib/db/queries");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const beginResult = await beginTransaction(testUserId);
      const txId = beginResult.transaction!.transactionId;

      // Delete user to simulate error
      await db.delete(user).where(eq(user.id, testUserId));

      const commitResult = await commitTransaction(txId);

      expect(commitResult.success).toBe(false);
      expect(commitResult.error).toBe("user_not_found");

      // Recreate user for other tests
      await db.insert(user).values({
        id: testUserId,
        email: testEmail,
        plan: "Free",
        dailyRequestLimit: "5",
        requestsToday: "0",
        lastRequestReset: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });
});
