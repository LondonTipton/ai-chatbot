import { cookies } from "next/headers";
import type { Models } from "node-appwrite";
import { createLogger } from "@/lib/logger";
import { getSession, refreshSession } from "./auth";
import { AuthErrorCode, handleAppwriteError } from "./errors";

const logger = createLogger("appwrite/session");

/**
 * Session cookie configuration
 */
export const SESSION_COOKIE_NAME = "appwrite-session";

/**
 * Session cookie options
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, // Changed from "strict" to "lax" for cross-domain Appwrite setup
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
} as const;

/**
 * Session refresh threshold (refresh when less than this time remains)
 * Set to 1 day before expiration
 */
const SESSION_REFRESH_THRESHOLD = 60 * 60 * 24; // 1 day in seconds

/**
 * Set session cookie
 * Sets both our custom session cookie and the Appwrite session cookie
 */
export async function setSessionCookie(
  sessionId: string,
  sessionSecret?: string,
  userId?: string
): Promise<void> {
  const cookieStore = await cookies();

  logger.log("[session] setSessionCookie called with:", {
    sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : "null",
    hasSecret: !!sessionSecret,
    secretLength: sessionSecret?.length || 0,
    userId: userId ? `${userId.substring(0, 8)}...` : "null",
  });

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  logger.log("[session] Project ID:", projectId);

  // Set our custom session cookie for tracking
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
  logger.log("[session] Custom session cookie set:", SESSION_COOKIE_NAME);

  // Persist user id for admin validation fallback in middleware
  if (userId) {
    cookieStore.set("appwrite_user_id", userId, {
      ...SESSION_COOKIE_OPTIONS,
      httpOnly: true,
    });
    logger.log("[session] User ID cookie set");
  }

  // Set the Appwrite session cookie if we have the secret
  // This is CRITICAL for verification emails to work
  if (sessionSecret && projectId) {
    const appwriteSessionCookieName = `a_session_${projectId}`;

    logger.log(
      "[session] Setting Appwrite session cookie:",
      appwriteSessionCookieName
    );
    logger.log(
      "[session] Session secret (first 10 chars):",
      sessionSecret.substring(0, 10)
    );

    // Set the cookie with the session secret (the actual JWT token)
    cookieStore.set(appwriteSessionCookieName, sessionSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    logger.log("[session] ✓ Appwrite session cookie SET");

    // Verify it was set
    const verifySet = cookieStore.get(appwriteSessionCookieName);
    logger.log("[session] Verification - cookie exists:", !!verifySet);
    logger.log(
      "[session] Verification - cookie value length:",
      verifySet?.value.length || 0
    );
  } else {
    if (!sessionSecret) {
      logger.error(
        "[session] ❌ No session secret provided - Appwrite cookie NOT set"
      );
    }
    if (!projectId) {
      logger.error("[session] ❌ No project ID - Appwrite cookie NOT set");
    }
  }
}

/**
 * Get session cookie value
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("appwrite_user_id");

  // Also clear the Appwrite session cookie
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (projectId) {
    const appwriteSessionCookieName = `a_session_${projectId}`;
    cookieStore.delete(appwriteSessionCookieName);
    logger.log(
      "[session] Cleared all session cookies including Appwrite cookie"
    );
  }
}

/**
 * Check if session needs refresh based on expiration time
 */
export function shouldRefreshSession(session: Models.Session): boolean {
  try {
    const expirationDate = new Date(session.expire);
    const now = new Date();
    const secondsUntilExpiration =
      (expirationDate.getTime() - now.getTime()) / 1000;

    return secondsUntilExpiration < SESSION_REFRESH_THRESHOLD;
  } catch {
    // If we can't parse the expiration date, assume refresh is needed
    return true;
  }
}

/**
 * Refresh session if needed and update cookie
 * Returns the refreshed session or null if refresh failed
 */
export async function refreshSessionIfNeeded(
  sessionId: string
): Promise<Models.Session | null> {
  try {
    // Get current session
    const session = await getSession(sessionId);

    if (!session) {
      // Session is invalid or expired
      await clearSessionCookie();
      return null;
    }

    // Check if session needs refresh
    if (shouldRefreshSession(session)) {
      logger.log(
        `[session] Refreshing session ${sessionId} (expires: ${session.expire})`
      );

      // Refresh the session
      const refreshedSession = await refreshSession(sessionId);

      // Update cookie with new session ID if it changed
      if (refreshedSession.$id !== sessionId) {
        await setSessionCookie(refreshedSession.$id);
      }

      return refreshedSession;
    }

    return session;
  } catch (error) {
    const authError = handleAppwriteError(error);

    // Clear cookie if session is expired or invalid
    if (
      authError.code === AuthErrorCode.SESSION_EXPIRED ||
      authError.code === AuthErrorCode.INVALID_CREDENTIALS
    ) {
      await clearSessionCookie();
    }

    logger.error("[session] Error refreshing session:", authError);
    return null;
  }
}

/**
 * Validate session cookie and refresh if needed
 * Returns the session if valid, null otherwise
 */
export async function validateAndRefreshSession(): Promise<Models.Session | null> {
  const sessionId = await getSessionCookie();

  if (!sessionId) {
    return null;
  }

  return refreshSessionIfNeeded(sessionId);
}
