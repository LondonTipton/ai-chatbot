import { createLogger } from "@/lib/logger";
import type { Session } from "@/lib/types";
import { getSessionCookie } from "./session";

const logger = createLogger("appwrite/server-auth");

/**
 * Get the current authenticated user session on the server
 * This replaces the NextAuth auth() function
 * Uses the same Appwrite standard cookie logic as middleware
 */
export async function auth(): Promise<Session | null> {
  try {
    // Use the same Appwrite standard cookie as middleware and session.ts
    const sessionSecret = await getSessionCookie();

    if (!sessionSecret) {
      logger.log("[server-auth] No session cookie found");
      return null;
    }

    logger.log("[server-auth] Found session cookie, validating...");

    // Validate session using Appwrite client SDK with the session secret
    try {
      // Create a client session to get user info
      const { Account, Client } = await import("node-appwrite");
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

      if (!endpoint || !projectId) {
        logger.error("[server-auth] Missing Appwrite configuration");
        return null;
      }

      const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setSession(sessionSecret);

      const account = new Account(client);
      const user = await account.get();

      logger.log(
        `[server-auth] Successfully validated user: ${user.email} (verified: ${user.emailVerification})`
      );

      return {
        user: {
          id: user.$id,
          email: user.email || undefined,
          name: user.name || undefined,
        },
      };
    } catch (validationError) {
      logger.error("[server-auth] Session validation failed:", validationError);
      return null;
    }
  } catch (error) {
    logger.error("[server-auth] Unexpected error getting session:", error);
    return null;
  }
}
