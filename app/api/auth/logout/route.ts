import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/appwrite/auth";

export async function POST() {
  try {
    console.log("[logout-api] Starting server-side logout...");

    const cookieStore = await cookies();

    // Get session information from cookies
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const appwriteSessionCookie = projectId
      ? cookieStore.get(`a_session_${projectId}`)?.value
      : null;
    const fallbackSessionId = cookieStore.get("appwrite-session")?.value;

    console.log("[logout-api] Project ID:", projectId);
    console.log(
      "[logout-api] Appwrite session cookie:",
      appwriteSessionCookie ? "Present" : "None"
    );
    console.log(
      "[logout-api] Fallback session ID:",
      fallbackSessionId ? "Present" : "None"
    );

    // Try to delete Appwrite session if we have the session cookie
    if (appwriteSessionCookie && fallbackSessionId) {
      try {
        await deleteSession(fallbackSessionId);
        console.log("[logout] Successfully deleted Appwrite session");
      } catch (error) {
        console.log("[logout] Failed to delete Appwrite session:", error);
        // Continue with cookie cleanup even if Appwrite deletion fails
      }
    }

    // Clear all authentication cookies
    const response = NextResponse.json({ success: true });

    // Clear Appwrite session cookie
    if (projectId) {
      const appwriteSessionCookieName = `a_session_${projectId}`;
      response.cookies.delete(appwriteSessionCookieName);
    }

    // Clear custom session cookies with all possible variations
    const cookiesToClear = [
      "appwrite-session",
      "appwrite_user_id",
      "appwrite-session-backup",
      "appwrite_user_id_backup",
      "appwrite-session-js",
      "appwrite_user_id_js",
    ];

    for (const cookieName of cookiesToClear) {
      response.cookies.delete(cookieName);
      // Also try with different path and domain options
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
    }

    return response;
  } catch (error) {
    console.error("[logout-api] Server-side logout error:", error);

    // Even if there's an error, try to clear cookies
    const response = NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );

    const cookieStore = await cookies();
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (projectId) {
      const appwriteSessionCookieName = `a_session_${projectId}`;
      response.cookies.delete(appwriteSessionCookieName);
    }

    response.cookies.delete("appwrite-session");
    response.cookies.delete("appwrite_user_id");

    return response;
  }
}
