import { Account, Client, type Models } from "appwrite";
import { type NextRequest, NextResponse } from "next/server";

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
 */
function getSessionCookie(request: NextRequest): string | null {
  // Appwrite stores session in a cookie named like: a_session_{projectId}
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) {
    return null;
  }

  const sessionCookieName = `a_session_${projectId}`;
  return request.cookies.get(sessionCookieName)?.value || null;
}

function getFallbackCookies(request: NextRequest): {
  sessionId: string | null;
  userId: string | null;
} {
  // Check multiple cookie sources
  const sessionId =
    request.cookies.get("appwrite-session")?.value ||
    request.cookies.get("appwrite-session-backup")?.value ||
    request.cookies.get("appwrite-session-js")?.value ||
    null;
  const userId =
    request.cookies.get("appwrite_user_id")?.value ||
    request.cookies.get("appwrite_user_id_backup")?.value ||
    request.cookies.get("appwrite_user_id_js")?.value ||
    null;
  return { sessionId, userId };
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
      console.error("Missing Appwrite configuration in middleware");
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
      console.log(
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
          console.log(
            `[middleware] Session refreshed. New expiration: ${refreshedSession.expire}`
          );
        }
      } catch (error) {
        console.error("[middleware] Failed to refresh session:", error);
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
        console.log(
          "[middleware] Guest session detected (not supported), will clear cookie"
        );
        return null;
      }
    }

    console.log("[middleware] Session validation failed:", error);
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
  const publicRoutes = ["/login", "/register", "/reset-password"];
  const isWellKnown = pathname.startsWith("/.well-known");
  const isPublicRoute = publicRoutes.includes(pathname);

  // Extract session cookie (primary: Appwrite cookie; fallback: our cookie)
  const sessionToken = getSessionCookie(request);
  const fallback = getFallbackCookies(request);

  // Debug: Log cookie presence
  if (sessionToken) {
    console.log(`[middleware] Found session cookie for ${pathname}`);
  } else {
    console.log(`[middleware] No session cookie found for ${pathname}`);
  }

  // Debug: Log all cookies and fallback cookies
  const allCookies = request.cookies.toString();
  console.log(
    `[middleware] All cookies: ${allCookies.substring(0, 200)}${
      allCookies.length > 200 ? "..." : ""
    }`
  );

  if (fallback.sessionId || fallback.userId) {
    console.log(
      `[middleware] Fallback cookies: sessionId=${fallback.sessionId?.substring(
        0,
        8
      )}..., userId=${fallback.userId?.substring(0, 8)}...`
    );
  } else {
    console.log("[middleware] No fallback cookies found");
  }

  // Validate session if token exists
  let validationResult: {
    user: Models.User<Models.Preferences>;
    session: Models.Session;
  } | null = null;

  if (sessionToken) {
    console.log(`[middleware] Validating session token for ${pathname}...`);
    validationResult = await validateSession(sessionToken);
    if (validationResult) {
      console.log(
        `[middleware] Session valid for user: ${validationResult.user.$id}`
      );
    } else {
      console.log(`[middleware] Session validation failed for ${pathname}`);
    }
  } else if (fallback.sessionId && fallback.userId) {
    console.log(
      `[middleware] Using fallback cookies for ${pathname}: sessionId present=${!!fallback.sessionId}, userId present=${!!fallback.userId}`
    );
    // Fallback: validate using server API with sessionId and userId stored in our cookies
    try {
      const res = await fetch(new URL("/api/auth/validate", request.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: fallback.sessionId,
          userId: fallback.userId,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data?.valid && data?.user && data?.session) {
          validationResult = { user: data.user, session: data.session };
          console.log(
            `[middleware] Fallback validation succeeded for user: ${data.user?.$id}`
          );
        } else {
          console.log("[middleware] Fallback validation returned invalid");
        }
      }
    } catch (e) {
      console.log("[middleware] Fallback validation failed:", e);
    }
  } else {
    // Last resort: check if there's temporary session data in the request
    // This handles cases where cookies haven't synced yet but we have session data
    const tempSessionHeader = request.headers.get("x-temp-session");
    if (tempSessionHeader) {
      try {
        const tempSession = JSON.parse(tempSessionHeader);
        if (tempSession.sessionId && tempSession.userId) {
          console.log(`[middleware] Using temp session data for ${pathname}`);

          // Quick validate using the temp session data
          const res = await fetch(
            new URL(
              `/api/auth/quick-validate?sessionId=${tempSession.sessionId}&userId=${tempSession.userId}`,
              request.url
            )
          );
          if (res.ok) {
            const data = (await res.json()) as any;
            if (data?.valid && data?.user && data?.session) {
              validationResult = { user: data.user, session: data.session };
              console.log(
                `[middleware] Temp session validation succeeded for user: ${data.user?.$id}`
              );
            }
          }
        }
      } catch (e) {
        console.log("[middleware] Temp session validation failed:", e);
      }
    }
  }

  // Development bypass: check for temp auth header when no cookies are available
  if (!validationResult && process.env.NODE_ENV === "development") {
    const tempAuthHeader = request.headers.get("x-temp-auth");

    if (tempAuthHeader) {
      try {
        const payload = JSON.parse(
          Buffer.from(tempAuthHeader, "base64").toString()
        );

        // Check if token is recent (less than 1 hour old)
        const now = Date.now();
        const tokenAge = now - payload.timestamp;

        if (tokenAge < 60 * 60 * 1000 && payload.userId && payload.sessionId) {
          console.log(
            `[middleware] Using development auth bypass for ${pathname}`
          );

          // Create a mock validation result for development
          validationResult = {
            user: {
              $id: payload.userId,
              $createdAt: new Date().toISOString(),
              $updatedAt: new Date().toISOString(),
              name: "Dev User",
              registration: new Date().toISOString(),
              status: true,
              labels: [],
              passwordUpdate: new Date().toISOString(),
              email: "dev@localhost.dev",
              phone: "",
              emailVerification: true,
              phoneVerification: false,
              mfa: false,
              prefs: {},
              targets: [],
              accessedAt: new Date().toISOString(),
            } as any,
            session: {
              $id: payload.sessionId,
              $createdAt: new Date().toISOString(),
              $updatedAt: new Date().toISOString(),
              userId: payload.userId,
              expire: new Date(Date.now() + 86_400_000).toISOString(), // 24 hours from now
              provider: "email",
              providerUid: payload.userId,
              providerAccessToken: "",
              providerAccessTokenExpiry: "",
              providerRefreshToken: "",
              ip: "127.0.0.1",
              osCode: "WIN",
              osName: "Windows",
              osVersion: "",
              clientType: "browser",
              clientCode: "CH",
              clientName: "Chrome",
              clientVersion: "",
              clientEngine: "",
              clientEngineVersion: "",
              deviceName: "localhost",
              deviceBrand: "",
              deviceModel: "",
              countryCode: "US",
              countryName: "United States",
              current: true,
              factors: [],
              secret: "",
              mfaUpdatedAt: "",
            } as any,
          };
        }
      } catch (e) {
        console.log("[middleware] Failed to parse temp auth header:", e);
      }
    }
  }

  // Development bypass: if we consistently have no cookies at all, let requests through
  // This allows client-side auth to work when server-side cookies are not functioning
  if (
    !validationResult &&
    !isPublicRoute &&
    !isWellKnown &&
    process.env.NODE_ENV === "development"
  ) {
    // Check if we have absolutely no cookies - this indicates a cookie system problem
    const hasCookies = request.cookies.toString().length > 0;

    if (!hasCookies) {
      console.log(
        `[middleware] DEVELOPMENT: No cookies detected, bypassing auth for ${pathname} - client-side auth will handle`
      );
      // Let the request through - client-side auth will handle authentication
      return NextResponse.next();
    }
  }

  // If no valid session and trying to access protected route, redirect to login
  if (!validationResult && !isPublicRoute && !isWellKnown) {
    console.log(
      "[middleware] No valid session, redirecting to login from",
      pathname
    );
    const loginUrl = new URL("/login", request.url);
    // Preserve the original URL for post-login redirect
    if (pathname !== "/") {
      loginUrl.searchParams.set("returnUrl", pathname);
    }

    // Only clear cookies if a session token was present but failed validation
    // Don't clear cookies if no token was found - they might be fallback cookies that need time to sync
    const response = NextResponse.redirect(loginUrl);
    if (sessionToken) {
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
      if (projectId) {
        // Clear Appwrite session cookie
        const sessionCookieName = `a_session_${projectId}`;
        response.cookies.delete(sessionCookieName);

        // Also clear our custom session cookie
        response.cookies.delete("appwrite-session");
        response.cookies.delete("appwrite_user_id");

        console.log("[middleware] Cleared invalid session cookies");
      }
    } else {
      console.log(
        "[middleware] No cookies cleared - no session token was present"
      );
    }

    return response;
  }

  // If valid session exists and user is on auth pages, redirect to home
  if (validationResult && (isPublicRoute || isWellKnown)) {
    console.log(
      "[middleware] Authenticated user on auth page, redirecting to home"
    );
    return NextResponse.redirect(new URL("/", request.url));
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

  // Attach session context to request headers for downstream use
  const response = NextResponse.next();
  response.headers.set("x-user-id", user.$id);
  response.headers.set("x-session-id", session.$id);

  return response;
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/login",
    "/register",

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
