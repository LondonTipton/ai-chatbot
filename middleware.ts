import { Account, Client, type Models } from "appwrite";
import { type NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("middleware");

// Session cache to improve performance
const sessionCache = new Map<
  string,
  {
    user: Models.User<Models.Preferences>;
    session: Models.Session;
    timestamp: number;
  }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Session refresh threshold (refresh when less than 1 day remains)
const SESSION_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000;

/**
 * Extract session cookie from request
 * Following Appwrite SSR standard: a_session_<PROJECT_ID>
 */
function getSessionCookie(request: NextRequest): string | null {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) {
    return null;
  }

  const sessionCookieName = `a_session_${projectId}`;
  return request.cookies.get(sessionCookieName)?.value || null;
}

/**
 * Check if session needs refresh based on expiration time
 */
function shouldRefreshSession(session: Models.Session): boolean {
  try {
    const expirationDate = new Date(session.expire);
    const now = new Date();
    const timeUntilExpiration = expirationDate.getTime() - now.getTime();

    return timeUntilExpiration < SESSION_REFRESH_THRESHOLD;
  } catch {
    return true;
  }
}

/**
 * Validate session using Appwrite client SDK (Edge compatible)
 */
async function validateSession(sessionToken: string): Promise<{
  user: Models.User<Models.Preferences>;
  session: Models.Session;
} | null> {
  // Check cache first
  const cached = sessionCache.get(sessionToken);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { user: cached.user, session: cached.session };
  }

  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
      logger.error("Missing Appwrite configuration in middleware");
      return null;
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setSession(sessionToken);

    const account = new Account(client);

    // Get user and session
    const user = await account.get();
    const sessions = await account.listSessions();
    const currentSession = sessions.sessions.find((s) => s.current);

    if (!currentSession) {
      return null;
    }

    // Check if session needs refresh and refresh it
    let sessionToReturn = currentSession;
    if (shouldRefreshSession(currentSession)) {
      logger.log(
        `[middleware] Session expires soon (${currentSession.expire}), refreshing...`
      );

      try {
        // Refresh by accessing the session again
        // Appwrite automatically extends the session expiration
        const refreshedSessions = await account.listSessions();
        const refreshedSession = refreshedSessions.sessions.find(
          (s) => s.current
        );

        if (refreshedSession) {
          sessionToReturn = refreshedSession;
          logger.log(
            `[middleware] Session refreshed. New expiration: ${refreshedSession.expire}`
          );
        }
      } catch (error) {
        logger.error("[middleware] Failed to refresh session:", error);
        // Continue with current session if refresh fails
      }
    }

    // Cache the valid session
    sessionCache.set(sessionToken, {
      user,
      session: sessionToReturn,
      timestamp: Date.now(),
    });

    return { user, session: sessionToReturn };
  } catch (error) {
    // Invalid or expired session
    sessionCache.delete(sessionToken);

    // Check if this is a guest session error
    if (error && typeof error === "object" && "type" in error) {
      const appwriteError = error as { type?: string; code?: number };
      if (
        appwriteError.type === "general_unauthorized_scope" &&
        appwriteError.code === 401
      ) {
        logger.log(
          "[middleware] Guest session detected (not supported), will clear cookie"
        );
        return null;
      }
    }

    logger.log("[middleware] Session validation failed:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/reset-password", "/verify"];
  const isWellKnown = pathname.startsWith("/.well-known");
  const isPublicRoute = publicRoutes.includes(pathname);

  // verify-pending is semi-protected - requires a session but not verification
  const isVerifyPending = pathname === "/verify-pending";

  // Extract session cookie (Appwrite standard: a_session_<PROJECT_ID>)
  const sessionToken = getSessionCookie(request);

  // Log session status
  if (sessionToken) {
    logger.log(`[middleware] Found session cookie for ${pathname}`);
  } else {
    logger.log(`[middleware] No session cookie found for ${pathname}`);
  }

  // Validate session if token exists
  let validationResult: {
    user: Models.User<Models.Preferences>;
    session: Models.Session;
  } | null = null;

  if (sessionToken) {
    logger.log(`[middleware] Validating session token for ${pathname}...`);
    validationResult = await validateSession(sessionToken);
    if (validationResult) {
      logger.log(
        `[middleware] Session valid for user: ${validationResult.user.$id}`
      );
    } else {
      logger.log(`[middleware] Session validation failed for ${pathname}`);
    }
  }

  // If no valid session and trying to access protected route, redirect to login
  if (!validationResult && !isPublicRoute && !isWellKnown && !isVerifyPending) {
    logger.log(
      "[middleware] No valid session, redirecting to login from",
      pathname
    );
    const loginUrl = new URL("/login", request.url);
    // Preserve the original URL for post-login redirect
    if (pathname !== "/") {
      loginUrl.searchParams.set("returnUrl", pathname);
    }

    // Clear invalid session cookies
    const response = NextResponse.redirect(loginUrl);
    if (sessionToken) {
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
      if (projectId) {
        const sessionCookieName = `a_session_${projectId}`;
        response.cookies.delete(sessionCookieName);
        response.cookies.delete("appwrite_session_id");
        logger.log("[middleware] Cleared invalid session cookies");
      }
    }

    return response;
  }

  // Special handling for verify-pending: if no session, redirect to login
  if (!validationResult && isVerifyPending) {
    logger.log(
      "[middleware] No session on verify-pending page, redirecting to login"
    );
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If valid session exists and user is on auth pages, redirect appropriately
  if (validationResult && (isPublicRoute || isWellKnown || isVerifyPending)) {
    const { user: authUser } = validationResult;

    // If user is not verified and not on verify/verify-pending pages, redirect to verify-pending
    if (
      !authUser.emailVerification &&
      pathname !== "/verify" &&
      pathname !== "/verify-pending"
    ) {
      logger.log(
        "[middleware] Unverified user on auth page, redirecting to verify-pending"
      );
      return NextResponse.redirect(new URL("/verify-pending", request.url));
    }

    // If user is verified and on verify-pending, redirect to home
    if (authUser.emailVerification && pathname === "/verify-pending") {
      logger.log(
        "[middleware] Verified user on verify-pending page, redirecting to home"
      );
      return NextResponse.redirect(new URL("/", request.url));
    }

    // If user is verified and on other auth pages (login/register), redirect to home
    if (
      authUser.emailVerification &&
      (pathname === "/login" || pathname === "/register")
    ) {
      logger.log(
        "[middleware] Verified user on auth page, redirecting to home"
      );
      return NextResponse.redirect(new URL("/", request.url));
    }

    // If user is on verify-pending with valid session, allow through
    if (pathname === "/verify-pending") {
      return NextResponse.next();
    }
  }

  // If no session and on public route, allow through
  if (!validationResult && (isPublicRoute || isWellKnown)) {
    return NextResponse.next();
  }

  // At this point, we have a valid session and are on a protected route
  if (!validationResult) {
    // This should never happen due to the checks above, but TypeScript needs it
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { user, session } = validationResult;

  // Check if user's email is verified for protected routes
  if (!user.emailVerification && !isPublicRoute && !isWellKnown) {
    logger.log(
      "[middleware] Unverified user attempting to access protected route, redirecting to verify-pending"
    );
    return NextResponse.redirect(new URL("/verify-pending", request.url));
  }

  // Attach session context to request headers for downstream use
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.$id);
  response.headers.set("x-session-id", session.$id);
  response.headers.set("x-email-verified", user.emailVerification.toString());

  return response;
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/login",
    "/register",
    "/verify-pending",
    "/verify",

    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handle auth separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.well-known).*)",
  ],
};
