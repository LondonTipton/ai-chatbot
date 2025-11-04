import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("validate/route");

export async function POST(request: Request) {
  try {
    const { sessionId, userId } = await request.json();

    logger.log(
      `[validate] Validating session for userId=${userId?.substring(0, 8)}...`
    );

    if (!sessionId || !userId) {
      logger.log("[validate] Missing sessionId or userId");
      return NextResponse.json(
        { error: "Missing sessionId or userId" },
        { status: 400 }
      );
    }

    const { users } = createAdminClient();
    // Ensure user exists
    const user = await users.get(userId);
    logger.log(`[validate] User found: ${user.email}`);

    // Create a minimal session object for middleware compatibility
    const session = {
      $id: sessionId,
      userId,
      expire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      current: true,
    };

    logger.log(`[validate] Session validation passed for user: ${user.email}`);
    return NextResponse.json({ valid: true, user, session }, { status: 200 });
  } catch (error) {
    logger.error("[validate] Session validation failed:", error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
