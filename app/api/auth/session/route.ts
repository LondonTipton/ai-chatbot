import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/appwrite/auth";

/**
 * Get current session user
 * This endpoint reads httpOnly cookies server-side and returns the user
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    console.log("[session] Project ID:", projectId);

    // Try Appwrite session cookie first
    const appwriteSessionCookie = projectId
      ? cookieStore.get(`a_session_${projectId}`)?.value
      : null;

    // Fallback to custom session cookies
    const fallbackSessionId = cookieStore.get("appwrite-session")?.value;
    const fallbackUserId = cookieStore.get("appwrite_user_id")?.value;

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

    const sessionId = appwriteSessionCookie || fallbackSessionId;

    if (!sessionId) {
      console.log("[session] No session ID found in cookies");
      return NextResponse.json({ user: null }, { status: 200 });
    }

    console.log(
      "[session] Getting user with session ID:",
      sessionId.substring(0, 8) + "..."
    );

    // Get user from Appwrite
    const user = await getCurrentUser(sessionId);

    if (!user) {
      console.log("[session] No user found for session");
      return NextResponse.json({ user: null }, { status: 200 });
    }

    console.log("[session] User found:", user.email);

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
  } catch (error) {
    console.error("[session] Error getting session:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
