import { type NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/appwrite/session";
import { createLogger } from "@/lib/logger";

const logger = createLogger("session/route");

/**
 * Get current session user
 * Simplified to follow Appwrite SSR standards - uses only a_session_<PROJECT_ID> cookie
 */
export async function GET(_: NextRequest) {
  try {
    // Get the Appwrite standard session cookie (contains the session secret/JWT)
    const sessionSecret = await getSessionCookie();

    if (!sessionSecret) {
      logger.log("[session] No session cookie found");
      return NextResponse.json({ user: null }, { status: 200 });
    }

    logger.log(
      "[session] Found session cookie:",
      `${sessionSecret.substring(0, 8)}...`
    );

    // Use Appwrite client SDK to validate the session
    const { Account, Client } = await import("node-appwrite");
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
      logger.error("[session] Missing Appwrite configuration");
      return NextResponse.json({ user: null }, { status: 500 });
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setSession(sessionSecret);

    const account = new Account(client);
    const user = await account.get();

    logger.log("[session] User authenticated:", user.email);

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

    // Prevent caching of session data
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    return response;
  } catch (error) {
    logger.error("[session] Session validation failed:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
