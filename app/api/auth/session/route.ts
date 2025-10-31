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
      if (!user) {
        console.log("[session] No user found for Appwrite session secret");
        return NextResponse.json({ user: null }, { status: 200 });
      }

      console.log("[session] User found via secret:", user.email);
      return NextResponse.json(
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
        return NextResponse.json({ user: null }, { status: 200 });
      }
    }

    console.log("[session] No session cookies found");
    return NextResponse.json({ user: null }, { status: 200 });
  } catch (error) {
    console.error("[session] Error getting session:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
