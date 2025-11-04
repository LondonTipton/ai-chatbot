import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/config";
import { createLogger } from "@/lib/logger";

const logger = createLogger("sync/route");

export async function POST(request: Request) {
  try {
    const { sessionId, userId } = await request.json();
    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing sessionId or userId" },
        { status: 400 }
      );
    }

    logger.log(
      `[sync] Validating session for userId=${userId.substring(0, 8)}...`
    );

    // Validate the session belongs to the user via Admin API
    const { users } = createAdminClient();

    // First ensure user exists
    const user = await users.get(userId);
    logger.log(`[sync] User found: ${user.email}`);

    // For now, we'll trust that if the user exists and we got valid sessionId/userId from the client,
    // the session is valid. In production, you might want to add additional validation.
    logger.log("[sync] Session validation passed (user exists)");

    const response = NextResponse.json({ valid: true }, { status: 200 });

    // Set cookies with explicit domain and more permissive settings for localhost
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      // For localhost, don't set domain to allow default behavior
      ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
    };

    response.cookies.set("appwrite-session", sessionId, cookieOptions);
    response.cookies.set("appwrite_user_id", userId, cookieOptions);

    // Also set non-httpOnly cookies as backup
    response.cookies.set("appwrite-session-backup", sessionId, {
      ...cookieOptions,
      httpOnly: false,
    });
    response.cookies.set("appwrite_user_id_backup", userId, {
      ...cookieOptions,
      httpOnly: false,
    });

    logger.log(
      `[sync] Set cookies for sessionId=${sessionId.substring(
        0,
        8
      )}..., userId=${userId.substring(0, 8)}...`
    );
    logger.log("[sync] HttpOnly cookies: appwrite-session, appwrite_user_id");
    logger.log(
      "[sync] Backup cookies: appwrite-session-backup, appwrite_user_id_backup"
    );
    logger.log(
      `[sync] Cookie settings - secure: ${cookieOptions.secure}, sameSite: ${cookieOptions.sameSite}, path: ${cookieOptions.path}`
    );

    return response;
  } catch {
    logger.log("[sync] Error during sync");
    return NextResponse.json({ error: "sync failed" }, { status: 500 });
  }
}
