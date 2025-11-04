import { cookies } from "next/headers";
import { createLogger } from "@/lib/logger";
import type { Session } from "@/lib/types";
import { createAdminClient } from "./config";

const logger = createLogger("appwrite/server-auth");

/**
 * Get the current authenticated user session on the server
 * This replaces the NextAuth auth() function
 * Uses the same logic as middleware for consistency
 */
export async function auth(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (!projectId) {
      logger.error("[server-auth] Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID");
      return null;
    }

    // Use same cookie checking logic as middleware
    const sessionCookieName = `a_session_${projectId}`;
    const sessionToken = cookieStore.get(sessionCookieName)?.value;
    const fallbackSession =
      cookieStore.get("appwrite-session")?.value ||
      cookieStore.get("appwrite-session-backup")?.value ||
      cookieStore.get("appwrite-session-js")?.value ||
      null;
    const userIdCookie =
      cookieStore.get("appwrite_user_id")?.value ||
      cookieStore.get("appwrite_user_id_backup")?.value ||
      cookieStore.get("appwrite_user_id_js")?.value ||
      null;

    logger.log(
      `[server-auth] Checking cookies - appwrite session: ${!!sessionToken}, fallback session: ${!!fallbackSession}, userId: ${!!userIdCookie}`
    );

    // Primary method: Use userId cookie if available
    if (userIdCookie) {
      try {
        const { users } = createAdminClient();
        const user = await users.get(userIdCookie);

        logger.log(
          `[server-auth] Successfully validated user via userId: ${user.email}`
        );
        return {
          user: {
            id: user.$id,
            email: user.email || undefined,
            name: user.name || undefined,
          },
        };
      } catch (userError) {
        logger.error(
          "[server-auth] Error validating user with userId cookie:",
          userError
        );
      }
    }

    // Fallback method: if we have a fallback session but no userId, we can't validate session without secret.
    // Prefer returning null to trigger client-side fetch/bridge to upgrade cookies.
    if (sessionToken || fallbackSession) {
      logger.log(
        "[server-auth] Session tokens present but no userId cookie; returning null to let client bridge upgrade cookies"
      );
      return null;
    }

    logger.log("[server-auth] No authentication cookies found");
    return null;
  } catch (error) {
    logger.error("[server-auth] Unexpected error getting session:", error);
    return null;
  }
}
