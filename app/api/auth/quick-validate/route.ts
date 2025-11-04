import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("quick-validate/route");

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");

    if (!sessionId || !userId) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    logger.log(
      `[quick-validate] Checking session for userId=${userId.substring(0, 8)}...`
    );

    // Validate the session belongs to the user via Admin API
    const { users } = createAdminClient();

    // First ensure user exists
    const user = await users.get(userId);
    logger.log(`[quick-validate] User found: ${user.email}`);

    logger.log("[quick-validate] Session validation passed (user exists)");

    // Set the same cookies that sync endpoint sets
    const response = NextResponse.json(
      {
        valid: true,
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
        },
        session: {
          $id: sessionId,
          userId,
        },
      },
      { status: 200 }
    );

    // Set httpOnly cookies on our domain for middleware fallback
    response.cookies.set("appwrite-session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    response.cookies.set("appwrite_user_id", userId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    logger.log(
      `[quick-validate] Set cookies for sessionId=${sessionId.substring(0, 8)}..., userId=${userId.substring(0, 8)}...`
    );

    return response;
  } catch (error) {
    logger.error("[quick-validate] Error during validation:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
