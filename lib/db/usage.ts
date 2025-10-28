import "server-only";

import { eq } from "drizzle-orm";
import { db } from "./queries";
import { user } from "./schema";

export type UsageCheckResult = {
  allowed: boolean;
  requestsToday: number;
  dailyLimit: number;
  plan: string;
  reason?: string;
};

/**
 * Check if user has remaining requests for today
 * Resets counter if it's a new day
 */
export async function checkAndIncrementUsage(
  userId: string
): Promise<UsageCheckResult> {
  try {
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
    const requestsToday = Number.parseInt(userRecord.requestsToday || "0", 10);
    const dailyLimit = Number.parseInt(userRecord.dailyRequestLimit || "5", 10);

    // Check if we need to reset the counter (new day)
    const needsReset =
      now.getUTCDate() !== lastReset.getUTCDate() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastReset.getUTCFullYear();

    if (needsReset) {
      // Reset counter for new day
      await db
        .update(user)
        .set({
          requestsToday: "1",
          lastRequestReset: now,
          updatedAt: now,
        })
        .where(eq(user.id, userId));

      return {
        allowed: true,
        requestsToday: 1,
        dailyLimit,
        plan: userRecord.plan,
      };
    }

    // Check if user has exceeded limit
    if (requestsToday >= dailyLimit) {
      return {
        allowed: false,
        requestsToday,
        dailyLimit,
        plan: userRecord.plan,
        reason: "daily_limit_reached",
      };
    }

    // Increment counter
    const newCount = requestsToday + 1;
    await db
      .update(user)
      .set({
        requestsToday: newCount.toString(),
        updatedAt: now,
      })
      .where(eq(user.id, userId));

    return {
      allowed: true,
      requestsToday: newCount,
      dailyLimit,
      plan: userRecord.plan,
    };
  } catch (error) {
    console.error("[Usage] Error checking usage:", error);
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
 * Get current usage stats for a user
 */
export async function getUserUsage(userId: string): Promise<UsageCheckResult> {
  try {
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

    // Check if counter should be reset
    const needsReset =
      now.getUTCDate() !== lastReset.getUTCDate() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCFullYear() !== lastReset.getUTCFullYear();

    if (needsReset) {
      requestsToday = 0;
    }

    return {
      allowed: requestsToday < dailyLimit,
      requestsToday,
      dailyLimit,
      plan: userRecord.plan,
    };
  } catch (error) {
    console.error("[Usage] Error getting usage:", error);
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
 * Update user's plan and daily limit
 */
export async function updateUserPlan(
  userId: string,
  plan: "Free" | "Basic" | "Pro" | "Pro+" | "Ultra"
): Promise<void> {
  try {
    // Set daily limits based on plan
    const limits: Record<string, number> = {
      Free: 5,
      Basic: 50,
      Pro: 200,
      "Pro+": 600,
      Ultra: 4000,
    };

    const dailyLimit = limits[plan] || 5;

    await db
      .update(user)
      .set({
        plan,
        dailyRequestLimit: dailyLimit.toString(),
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    console.log(`[Usage] Updated user ${userId} to plan ${plan}`);
  } catch (error) {
    console.error("[Usage] Error updating user plan:", error);
    throw error;
  }
}
