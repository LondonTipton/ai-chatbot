import { cookies } from "next/headers";
import type { Session } from "@/lib/types";
import { createAdminClient } from "./config";

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
      console.error("[server-auth] Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID");
      return null;
    }

    // Use same cookie checking logic as middleware
    const sessionCookieName = `a_session_${projectId}`;
    const sessionToken = cookieStore.get(sessionCookieName)?.value;
    const fallbackSession = cookieStore.get("appwrite-session")?.value;
    const userIdCookie = cookieStore.get("appwrite_user_id")?.value;

    console.log(
      `[server-auth] Checking cookies - appwrite session: ${!!sessionToken}, fallback session: ${!!fallbackSession}, userId: ${!!userIdCookie}`
    );

    // Primary method: Use userId cookie if available
    if (userIdCookie) {
      try {
        const { users } = createAdminClient();
        const user = await users.get(userIdCookie);

        console.log(
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
        console.error(
          "[server-auth] Error validating user with userId cookie:",
          userError
        );
      }
    }

    // Fallback method: If we have session tokens but no userId cookie,
    // try to extract from session (this should rarely happen if sync is working)
    if (sessionToken || fallbackSession) {
      console.log(
        "[server-auth] No userId cookie, but have session tokens - this indicates sync may have failed"
      );

      // In this case, we can't reliably get the user without the validation endpoint
      // This should be rare if the auth flow is working properly
      return null;
    }

    console.log("[server-auth] No authentication cookies found");
    return null;
  } catch (error) {
    console.error("[server-auth] Unexpected error getting session:", error);
    return null;
  }
}
