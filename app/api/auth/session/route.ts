import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/appwrite/auth";
import { createAdminClient } from "@/lib/appwrite/config";

/**
 * Get current session user
 * This endpoint reads httpOnly cookies server-side and returns the user
 */
export async function GET(_: NextRequest) {
  try {
    const cookieStore = await cookies();
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    console.log("[session] Project ID:", projectId);

    // Try Appwrite session cookie (secret) first
    const appwriteSessionCookie = projectId
      ? cookieStore.get(`a_session_${projectId}`)?.value
      : null;

    // Fallback to our custom cookies (consider all variants: primary, backup, js)
    const fallbackSessionId =
      cookieStore.get("appwrite-session")?.value ||
      cookieStore.get("appwrite-session-backup")?.value ||
      cookieStore.get("appwrite-session-js")?.value ||
      null;
    const fallbackUserId =
      cookieStore.get("appwrite_user_id")?.value ||
      cookieStore.get("appwrite_user_id_backup")?.value ||
      cookieStore.get("appwrite_user_id_js")?.value ||
      null;

    console.log(
      "[session] Appwrite session cookie:",
      appwriteSessionCookie ? "found" : "not found"
    );
    console.log(
      "[session] Fallback session ID:",
      fallbackSessionId ? "found" : "not found"
    );
    console.log(
      "[session] Fallback user ID:",
      fallbackUserId ? "found" : "not found"
    );

    // Primary path: we have the Appwrite session secret cookie
    if (appwriteSessionCookie) {
      const secretPreview = `${appwriteSessionCookie.substring(0, 8)}...`;
      console.log("[session] Using Appwrite session secret:", secretPreview);

      // Get user from Appwrite using the session secret
      const user = await getCurrentUser(appwriteSessionCookie);
      if (user) {
        console.log("[session] User found via secret:", user.email);
        const resp = NextResponse.json(
          {
            user: {
              $id: user.$id,
              email: user.email,
              name: user.name,
              emailVerification: user.emailVerification,
            },
          },
          { status: 200 }
        );
        resp.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );
        return resp;
      }

      // Secret exists but is invalid/expired; fall back to admin lookup using our cookies
      console.log(
        "[session] Secret invalid; attempting fallback via userId/sessionId cookies"
      );

      if (fallbackSessionId && fallbackUserId) {
        try {
          const { users } = createAdminClient();
          const fbUser = await users.get(fallbackUserId);
          const response = NextResponse.json(
            {
              user: {
                $id: fbUser.$id,
                email: fbUser.email,
                name: fbUser.name,
                emailVerification: fbUser.emailVerification,
              },
            },
            { status: 200 }
          );
          response.headers.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
          );

          // Clean up bad Appwrite secret cookie and upgrade our cookies
          if (projectId) {
            response.cookies.delete(`a_session_${projectId}`);
          }
          const isProduction = process.env.NODE_ENV === "production";
          const cookieOptions = {
            httpOnly: true,
            sameSite: "lax" as const,
            secure: isProduction,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            ...(isProduction && process.env.COOKIE_DOMAIN
              ? { domain: process.env.COOKIE_DOMAIN }
              : {}),
          };
          response.cookies.set(
            "appwrite-session",
            fallbackSessionId,
            cookieOptions
          );
          response.cookies.set(
            "appwrite_user_id",
            fallbackUserId,
            cookieOptions
          );
          console.log(
            "[session] Fallback user found via admin after secret failure:",
            fbUser.email
          );
          return response;
        } catch (e) {
          console.error(
            "[session] Fallback via admin after secret failure also failed:",
            e
          );
          // Delete the bad secret to avoid flapping
          const resp = NextResponse.json({ user: null }, { status: 200 });
          resp.headers.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
          );
          if (projectId) {
            resp.cookies.delete(`a_session_${projectId}`);
          }
          return resp;
        }
      }
      // No fallback available; delete bad secret and return null
      const resp = NextResponse.json({ user: null }, { status: 200 });
      resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      if (projectId) {
        resp.cookies.delete(`a_session_${projectId}`);
      }
      return resp;
    }

    // Fallback path: we only have our custom cookies (sessionId + userId)
    if (fallbackSessionId && fallbackUserId) {
      console.log(
        "[session] Using fallback cookies - sessionId:",
        `${fallbackSessionId.substring(0, 8)}...`,
        "userId:",
        `${fallbackUserId.substring(0, 8)}...`
      );

      try {
        // Validate the user exists via Admin API (can't validate session without secret here)
        const { users } = createAdminClient();
        const user = await users.get(fallbackUserId);

        // Upgrade cookies to httpOnly if only backup/js cookies were present
        const response = NextResponse.json(
          {
            user: {
              $id: user.$id,
              email: user.email,
              name: user.name,
              emailVerification: user.emailVerification,
            },
          },
          { status: 200 }
        );
        response.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );

        const isProduction = process.env.NODE_ENV === "production";
        const cookieOptions = {
          httpOnly: true,
          sameSite: "lax" as const,
          secure: isProduction,
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          ...(isProduction && process.env.COOKIE_DOMAIN
            ? { domain: process.env.COOKIE_DOMAIN }
            : {}),
        };

        // Set canonical httpOnly cookies so future requests are reliable
        response.cookies.set(
          "appwrite-session",
          fallbackSessionId,
          cookieOptions
        );
        response.cookies.set("appwrite_user_id", fallbackUserId, cookieOptions);

        console.log("[session] Fallback user found:", user.email);
        return response;
      } catch (e) {
        console.error("[session] Fallback validation failed:", e);
        const resp = NextResponse.json({ user: null }, { status: 200 });
        resp.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate"
        );
        return resp;
      }
    }

    console.log("[session] No session cookies found");
    const resp = NextResponse.json({ user: null }, { status: 200 });
    resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return resp;
  } catch (error) {
    console.error("[session] Error getting session:", error);
    const resp = NextResponse.json({ user: null }, { status: 200 });
    resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return resp;
  }
}
