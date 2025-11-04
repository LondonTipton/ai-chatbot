/**
 * Test Helper API Route
 * Provides endpoints for integration testing of retry flow
 * Only available in development/test environments
 */

import { generateId } from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { user } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";

const logger = createLogger("test-helpers/route");

import {
  beginTransaction,
  commitTransaction,
  getTransaction,
  rollbackTransaction,
} from "@/lib/db/usage-transaction";

// Only allow in non-production environments
if (process.env.NODE_ENV === "production") {
  throw new Error("Test helpers are not available in production");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "createTestUser": {
        const { email } = params;
        const [newUser] = await db
          .insert(user)
          .values({
            email,
            appwriteId: generateId(),
            isGuest: false,
            requestsToday: "0",
            dailyRequestLimit: "5",
            lastRequestReset: new Date(),
            plan: "Free",
          })
          .returning();

        return NextResponse.json({ user: newUser });
      }

      case "getUserUsage": {
        const { userId } = params;
        const [userRecord] = await db
          .select()
          .from(user)
          .where(eq(user.id, userId));

        return NextResponse.json({
          requestsToday: Number.parseInt(userRecord?.requestsToday || "0", 10),
          dailyLimit: Number.parseInt(userRecord?.dailyRequestLimit || "5", 10),
        });
      }

      case "updateUserUsage": {
        const { userId, requestsToday, dailyRequestLimit, lastRequestReset } =
          params;
        await db
          .update(user)
          .set({
            requestsToday: requestsToday?.toString(),
            dailyRequestLimit: dailyRequestLimit?.toString(),
            lastRequestReset: lastRequestReset
              ? new Date(lastRequestReset)
              : undefined,
          })
          .where(eq(user.id, userId));

        return NextResponse.json({ success: true });
      }

      case "beginTransaction": {
        const { userId } = params;
        const result = await beginTransaction(userId);
        return NextResponse.json(result);
      }

      case "commitTransaction": {
        const { transactionId } = params;
        const result = await commitTransaction(transactionId);
        return NextResponse.json(result);
      }

      case "rollbackTransaction": {
        const { transactionId } = params;
        const result = await rollbackTransaction(transactionId);
        return NextResponse.json(result);
      }

      case "getTransaction": {
        const { transactionId } = params;
        const transaction = getTransaction(transactionId);
        return NextResponse.json({ transaction });
      }

      case "deleteTestUser": {
        const { userId } = params;
        await db.delete(user).where(eq(user.id, userId));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[TestHelpers] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
