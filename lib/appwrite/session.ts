import { cookies } from "next/headers";
import type { Models } from "node-appwrite";
import { createLogger } from "@/lib/logger";
import { getSession, refreshSession } from "./auth";
import { AuthErrorCode, handleAppwriteError } from "./errors";

const logger = createLogger("appwrite/session");

/**
 * Session refresh threshold (refresh when less than this time remains)
 * Set to 1 day before expiration
 */
const SESSION_REFRESH_THRESHOLD = 60 * 60 * 24; // 1 day in seconds

/**
 * Get the Appwrite session cookie name
 * Following Appwrite SSR standard: a_session_<PROJECT_ID>
 */
function getSessionCookieName(): string | null {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) {
    logger.error("[session] Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID");
    return null;
  }
  return `a_session_${projectId}`;
}

/**
 * Get the session ID cookie name (for management operations)
 */
function getSessionIdCookieName(): string {
  return "appwrite_session_id";
}

/**
 * Set session cookie following Appwrite SSR standard
 * Stores session secret in a_session_<PROJECT_ID> for authentication
 * Stores session ID separately for refresh/management operations
 *
 * @param sessionSecret - The session secret (JWT token) from session.secret
 * @param sessionId - The session ID from session.$id (for refresh operations)
 */
export async function setSessionCookie(
  sessionSecret: string,
  sessionId: string
): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookieName = getSessionCookieName();

  if (!sessionCookieName) {
    logger.error("[session] Cannot set cookie - missing project ID");
    return;
  }

  logger.log("[session] Setting session cookies:", {
    sessionIdLength: sessionId.length,
    secretLength: sessionSecret.length,
    secretPreview: `${sessionSecret.substring(0, 5)}...`,
    cookieName: sessionCookieName,
  });

  // Set the Appwrite session cookie with the secret (JWT token)
  // This is used by Appwrite SDKs for authentication
  cookieStore.set(sessionCookieName, sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  // Store session ID for management operations (refresh, delete)
  cookieStore.set(getSessionIdCookieName(), sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  logger.log("[session] ✓ Session cookies set successfully");
}

/**
 * Get session secret (JWT token) for authentication
 * Returns the value from a_session_<PROJECT_ID> cookie
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookieName = getSessionCookieName();

  if (!sessionCookieName) {
    return null;
  }

  return cookieStore.get(sessionCookieName)?.value || null;
}

/**
 * Get session ID for management operations
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(getSessionIdCookieName())?.value || null;
}

/**
 * Clear all session cookies
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const sessionCookieName = getSessionCookieName();

  if (sessionCookieName) {
    cookieStore.delete(sessionCookieName);
  }

  cookieStore.delete(getSessionIdCookieName());

  logger.log("[session] ✓ All session cookies cleared");
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
 * Uses session ID (not secret) for refresh operations
 * Returns the refreshed session or null if refresh failed
 */
export async function refreshSessionIfNeeded(): Promise<Models.Session | null> {
  try {
    const sessionId = await getSessionId();

    if (!sessionId) {
      logger.error("[session] No session ID found for refresh");
      return null;
    }

    // Get current session using session ID
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

      // Refresh the session using session ID
      const refreshedSession = await refreshSession(sessionId);

      // Update cookies with refreshed session data
      await setSessionCookie(refreshedSession.secret, refreshedSession.$id);

      logger.log(
        `[session] Session refreshed. New expiration: ${refreshedSession.expire}`
      );

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
  const sessionSecret = await getSessionCookie();

  if (!sessionSecret) {
    return null;
  }

  return refreshSessionIfNeeded();
}
