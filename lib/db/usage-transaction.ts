import "server-only";

import { eq } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { db } from "./queries";
import { user } from "./schema";
import type { UsageCheckResult } from "./usage";
import { usageCache } from "./usage-cache";

const logger = createLogger("db/usage-transaction");

/**
 * Represents an active usage transaction
 */
export type UsageTransaction = {
  transactionId: string;
  userId: string;
  startTime: Date;
  expiresAt: Date;
  committed: boolean;
  rolledBack: boolean;
  attemptCount: number;
  lastAttemptTime?: Date;
};

/**
 * Result of beginning a transaction
 */
export type BeginTransactionResult = {
  allowed: boolean;
  transaction?: UsageTransaction;
  currentUsage: UsageCheckResult;
};

/**
 * Result of committing a transaction
 */
export type CommitTransactionResult = {
  success: boolean;
  newUsage: UsageCheckResult;
  error?: string;
};

/**
 * Result of rolling back a transaction
 */
export type RollbackTransactionResult = {
  success: boolean;
  currentUsage: UsageCheckResult;
  error?: string;
};

/**
 * In-memory store for active transactions
 * Key: transactionId
 */
const activeTransactions = new Map<string, UsageTransaction>();

/**
 * Transaction timeout in milliseconds
 * Default: 5 minutes (300000 ms)
 */
const TRANSACTION_TIMEOUT_MS = Number.parseInt(
  process.env.TRANSACTION_TIMEOUT_MS || "300000",
  10
);

/**
 * Cleanup interval in milliseconds
 * Default: 1 minute (60000 ms)
 */
const CLEANUP_INTERVAL_MS = Number.parseInt(
  process.env.TRANSACTION_CLEANUP_INTERVAL_MS || "60000",
  10
);

/**
 * Generate a unique transaction ID
 */
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Check if a transaction has expired
 */
function isTransactionExpired(transaction: UsageTransaction): boolean {
  return new Date() > transaction.expiresAt;
}

/**
 * Clean up expired and completed transactions
 */
function cleanupTransactions(): void {
  const now = new Date();
  const toDelete: string[] = [];

  for (const [txId, tx] of activeTransactions.entries()) {
    // Remove if expired
    if (now > tx.expiresAt) {
      toDelete.push(txId);
      continue;
    }

    // Remove committed/rolled back transactions after 1 minute
    if (tx.committed || tx.rolledBack) {
      const completionTime = tx.lastAttemptTime || tx.startTime;
      const timeSinceCompletion = now.getTime() - completionTime.getTime();
      if (timeSinceCompletion > 60_000) {
        toDelete.push(txId);
      }
    }
  }

  for (const txId of toDelete) {
    activeTransactions.delete(txId);
  }

  if (toDelete.length > 0) {
    logger.log(`[UsageTransaction] Cleaned up ${toDelete.length} transactions`);
  }
}

/**
 * Start cleanup interval
 */
let cleanupIntervalId: NodeJS.Timeout | null = null;

function startCleanupInterval(): void {
  if (cleanupIntervalId) {
    return;
  }

  cleanupIntervalId = setInterval(() => {
    cleanupTransactions();
  }, CLEANUP_INTERVAL_MS);

  // Ensure cleanup runs on process exit
  if (typeof process !== "undefined") {
    process.on("beforeExit", () => {
      if (cleanupIntervalId) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
      }
    });
  }
}

// Start cleanup when module loads
startCleanupInterval();

/**
 * Check current usage without incrementing
 * Uses cache to reduce database load
 */
async function checkUsageWithoutIncrement(
  userId: string
): Promise<UsageCheckResult> {
  try {
    // Try cache first
    const cached = usageCache.get(userId);
    if (cached) {
      logger.log(`[UsageTransaction] Cache hit for user ${userId}`);

      const now = new Date();
      const needsReset =
        now.getUTCDate() !== cached.lastReset.getUTCDate() ||
        now.getUTCMonth() !== cached.lastReset.getUTCMonth() ||
        now.getUTCFullYear() !== cached.lastReset.getUTCFullYear();

      const requestsToday = needsReset ? 0 : cached.requestsToday;
      const wouldExceedLimit = requestsToday >= cached.dailyLimit;

      return {
        allowed: !wouldExceedLimit,
        requestsToday,
        dailyLimit: cached.dailyLimit,
        plan: cached.plan,
        reason: wouldExceedLimit ? "daily_limit_reached" : undefined,
      };
    }

    // Cache miss - query database
    logger.log(`[UsageTransaction] Cache miss for user ${userId}`);
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!userRecord) {
      return {
        allowed: false,
        requestsToday: 0,
        dailyLimit: 0,
        plan: "Free",
        reason: "user_not_found",
      };
    }

    const now = new Date();
    const lastReset = new Date(userRecord.lastRequestReset);
    let requestsToday = Number.parseInt(userRecord.requestsToday || "0", 10);
    const dailyLimit = Number.parseInt(userRecord.dailyRequestLimit || "5", 10);

    // Check if we need to reset the counter (new day)
    const needsReset =
      now.getUTCDate() !== lastReset.getUTCDate() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastReset.getUTCFullYear();

    if (needsReset) {
      requestsToday = 0;
    }

    // Cache the result
    usageCache.set(userId, {
      userId,
      dailyLimit,
      requestsToday,
      lastReset,
      plan: userRecord.plan,
    });

    // Check if user would exceed limit with this request
    const wouldExceedLimit = requestsToday >= dailyLimit;

    return {
      allowed: !wouldExceedLimit,
      requestsToday,
      dailyLimit,
      plan: userRecord.plan,
      reason: wouldExceedLimit ? "daily_limit_reached" : undefined,
    };
  } catch (error) {
    logger.error("[UsageTransaction] Error checking usage:", error);
    return {
      allowed: false,
      requestsToday: 0,
      dailyLimit: 0,
      plan: "Free",
      reason: "error",
    };
  }
}

/**
 * Begin a usage transaction
 * Checks if user can make a request without incrementing the counter
 */
export async function beginTransaction(
  userId: string
): Promise<BeginTransactionResult> {
  // Development bypass - unlimited requests in development
  if (process.env.NODE_ENV === "development") {
    const transactionId = generateTransactionId();
    logger.log(
      `[UsageTransaction] Development mode - bypassing limits for transaction ${transactionId}`
    );

    const transaction: UsageTransaction = {
      transactionId,
      userId,
      startTime: new Date(),
      expiresAt: new Date(Date.now() + TRANSACTION_TIMEOUT_MS),
      committed: false,
      rolledBack: false,
      attemptCount: 0,
    };

    activeTransactions.set(transactionId, transaction);

    return {
      allowed: true,
      transaction,
      currentUsage: {
        allowed: true,
        requestsToday: 0,
        dailyLimit: 999,
        plan: "Dev",
      },
    };
  }

  try {
    // Check current usage without incrementing
    const currentUsage = await checkUsageWithoutIncrement(userId);

    if (!currentUsage.allowed) {
      logger.log(
        `[UsageTransaction] User ${userId} not allowed: ${currentUsage.reason}`
      );
      return {
        allowed: false,
        currentUsage,
      };
    }

    // Create transaction
    const transactionId = generateTransactionId();
    const startTime = new Date();
    const expiresAt = new Date(startTime.getTime() + TRANSACTION_TIMEOUT_MS);

    const transaction: UsageTransaction = {
      transactionId,
      userId,
      startTime,
      expiresAt,
      committed: false,
      rolledBack: false,
      attemptCount: 0,
    };

    activeTransactions.set(transactionId, transaction);

    logger.log(
      `[UsageTransaction] Created transaction ${transactionId} for user ${userId}`
    );

    return {
      allowed: true,
      transaction,
      currentUsage,
    };
  } catch (error) {
    logger.error("[UsageTransaction] Error beginning transaction:", error);
    return {
      allowed: false,
      currentUsage: {
        allowed: false,
        requestsToday: 0,
        dailyLimit: 0,
        plan: "Free",
        reason: "error",
      },
    };
  }
}

/**
 * Commit a transaction - actually increment the usage counter
 */
export async function commitTransaction(
  transactionId: string
): Promise<CommitTransactionResult> {
  try {
    const transaction = activeTransactions.get(transactionId);

    if (!transaction) {
      logger.error(`[UsageTransaction] Transaction ${transactionId} not found`);
      return {
        success: false,
        newUsage: {
          allowed: false,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
          reason: "transaction_not_found",
        },
        error: "transaction_not_found",
      };
    }

    // Check if transaction has expired
    if (isTransactionExpired(transaction)) {
      logger.error(
        `[UsageTransaction] Transaction ${transactionId} has expired`
      );
      activeTransactions.delete(transactionId);
      return {
        success: false,
        newUsage: {
          allowed: false,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
          reason: "transaction_expired",
        },
        error: "transaction_expired",
      };
    }

    // Check if already committed or rolled back
    if (transaction.committed) {
      logger.warn(
        `[UsageTransaction] Transaction ${transactionId} already committed`
      );
      return {
        success: true,
        newUsage: {
          allowed: true,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
        },
      };
    }

    if (transaction.rolledBack) {
      logger.error(
        `[UsageTransaction] Transaction ${transactionId} already rolled back`
      );
      return {
        success: false,
        newUsage: {
          allowed: false,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
          reason: "transaction_rolled_back",
        },
        error: "transaction_rolled_back",
      };
    }

    // Perform the actual usage increment
    const userId = transaction.userId;
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId));

    if (!userRecord) {
      return {
        success: false,
        newUsage: {
          allowed: false,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
          reason: "user_not_found",
        },
        error: "user_not_found",
      };
    }

    const now = new Date();
    const lastReset = new Date(userRecord.lastRequestReset);
    const requestsToday = Number.parseInt(userRecord.requestsToday || "0", 10);
    const dailyLimit = Number.parseInt(userRecord.dailyRequestLimit || "5", 10);

    // Check if we need to reset the counter (new day)
    const needsReset =
      now.getUTCDate() !== lastReset.getUTCDate() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastReset.getUTCFullYear();

    let newCount: number;
    if (needsReset) {
      // Reset counter for new day
      newCount = 1;
      await db
        .update(user)
        .set({
          requestsToday: newCount.toString(),
          lastRequestReset: now,
          updatedAt: now,
        })
        .where(eq(user.id, userId));
    } else {
      // Increment counter
      newCount = requestsToday + 1;
      await db
        .update(user)
        .set({
          requestsToday: newCount.toString(),
          updatedAt: now,
        })
        .where(eq(user.id, userId));
    }

    // Mark transaction as committed
    transaction.committed = true;
    transaction.lastAttemptTime = now;

    // Invalidate cache since we updated the database
    usageCache.invalidate(userId);
    logger.log(`[UsageTransaction] Invalidated cache for user ${userId}`);

    logger.log(
      `[UsageTransaction] Committed transaction ${transactionId} for user ${userId}: ${newCount}/${dailyLimit}`
    );

    return {
      success: true,
      newUsage: {
        allowed: newCount < dailyLimit,
        requestsToday: newCount,
        dailyLimit,
        plan: userRecord.plan,
      },
    };
  } catch (error) {
    logger.error(
      `[UsageTransaction] Error committing transaction ${transactionId}:`,
      error
    );
    return {
      success: false,
      newUsage: {
        allowed: false,
        requestsToday: 0,
        dailyLimit: 0,
        plan: "Free",
        reason: "error",
      },
      error: "commit_error",
    };
  }
}

/**
 * Rollback a transaction - decrement the counter if it was already committed
 */
export async function rollbackTransaction(
  transactionId: string
): Promise<RollbackTransactionResult> {
  try {
    const transaction = activeTransactions.get(transactionId);

    if (!transaction) {
      logger.error(
        `[UsageTransaction] Rollback: Transaction ${transactionId} not found`
      );
      return {
        success: false,
        currentUsage: {
          allowed: false,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
          reason: "transaction_not_found",
        },
        error: "transaction_not_found",
      };
    }

    // Check if transaction has expired
    if (isTransactionExpired(transaction)) {
      logger.warn(
        `[UsageTransaction] Rollback: Transaction ${transactionId} has expired`
      );
      activeTransactions.delete(transactionId);
    }

    // If already rolled back, return success
    if (transaction.rolledBack) {
      logger.warn(
        `[UsageTransaction] Transaction ${transactionId} already rolled back`
      );
      return {
        success: true,
        currentUsage: {
          allowed: true,
          requestsToday: 0,
          dailyLimit: 0,
          plan: "Free",
        },
      };
    }

    const userId = transaction.userId;

    // If transaction was committed, we need to decrement the counter
    if (transaction.committed) {
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId));

      if (!userRecord) {
        return {
          success: false,
          currentUsage: {
            allowed: false,
            requestsToday: 0,
            dailyLimit: 0,
            plan: "Free",
            reason: "user_not_found",
          },
          error: "user_not_found",
        };
      }

      const currentCount = Number.parseInt(userRecord.requestsToday || "0", 10);
      const dailyLimit = Number.parseInt(
        userRecord.dailyRequestLimit || "5",
        10
      );

      // Decrement counter, but ensure it doesn't go below 0
      let newCount = Math.max(0, currentCount - 1);

      // Edge case: If user would still be at limit after rollback, ensure they have at least 1 request available
      // This handles the case where a user at their limit gets a failed response
      if (newCount >= dailyLimit && currentCount > 0) {
        newCount = Math.max(0, dailyLimit - 1);
        logger.log(
          `[UsageTransaction] Rollback: User ${userId} was at limit, ensuring at least 1 request available`
        );
      }

      await db
        .update(user)
        .set({
          requestsToday: newCount.toString(),
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

      // Invalidate cache since we updated the database
      usageCache.invalidate(userId);
      logger.log(`[UsageTransaction] Invalidated cache for user ${userId}`);

      // Verify rollback success by checking the updated value
      const [verifyRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId));

      const verifiedCount = Number.parseInt(
        verifyRecord?.requestsToday || "0",
        10
      );

      if (verifiedCount !== newCount) {
        logger.error(
          `[UsageTransaction] CRITICAL: Rollback verification failed for user ${userId}`
        );
        logger.error(
          `[UsageTransaction] Expected: ${newCount}, Actual: ${verifiedCount}`
        );
      }

      logger.log(
        `[UsageTransaction] Rolled back transaction ${transactionId} for user ${userId}: ${currentCount} → ${newCount}`
      );
      logger.log(
        "[UsageTransaction] Rollback reason: All retry attempts exhausted"
      );

      transaction.rolledBack = true;
      transaction.lastAttemptTime = new Date();

      return {
        success: true,
        currentUsage: {
          allowed: newCount < dailyLimit,
          requestsToday: newCount,
          dailyLimit,
          plan: userRecord.plan,
        },
      };
    }

    // If not committed, just mark as rolled back (no DB operation needed)
    transaction.rolledBack = true;
    transaction.lastAttemptTime = new Date();

    logger.log(
      `[UsageTransaction] Rolled back uncommitted transaction ${transactionId} for user ${userId}`
    );

    return {
      success: true,
      currentUsage: {
        allowed: true,
        requestsToday: 0,
        dailyLimit: 0,
        plan: "Free",
      },
    };
  } catch (error) {
    logger.error(
      `[UsageTransaction] CRITICAL: Rollback failed for transaction ${transactionId}:`,
      error
    );
    return {
      success: false,
      currentUsage: {
        allowed: false,
        requestsToday: 0,
        dailyLimit: 0,
        plan: "Free",
        reason: "error",
      },
      error: "rollback_error",
    };
  }
}

/**
 * Get transaction by ID (for debugging/monitoring)
 */
export function getTransaction(
  transactionId: string
): UsageTransaction | undefined {
  return activeTransactions.get(transactionId);
}

/**
 * Get all active transactions (for debugging/monitoring)
 */
export function getActiveTransactions(): UsageTransaction[] {
  return Array.from(activeTransactions.values());
}

/**
 * Force cleanup (for testing)
 */
export function forceCleanup(): void {
  cleanupTransactions();
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStatistics() {
  return usageCache.getStats();
}

/**
 * Get cache hit rate (for monitoring)
 */
export function getCacheHitRate(): number {
  return usageCache.getHitRate();
}
