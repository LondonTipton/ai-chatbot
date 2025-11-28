import { ID, type Models } from "node-appwrite";
import { createLogger } from "@/lib/logger";

const logger = createLogger("appwrite/auth");

import {
  createAdminClient,
  createSessionClient,
  getAppwriteConfig,
} from "./config";
import {
  type AuthError,
  AuthErrorCode,
  handleAppwriteError,
  isRetryableError,
  logAuthError,
} from "./errors";

/**
 * Retry configuration for network operations
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
};

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operation: string
): Promise<T> {
  let lastError: AuthError | undefined;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = handleAppwriteError(error);

      // Only retry if error is retryable and we have attempts left
      if (
        !isRetryableError(lastError) ||
        attempt === RETRY_CONFIG.maxRetries - 1
      ) {
        logAuthError(lastError, {
          operation,
          timestamp: new Date(),
        });
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.initialDelay * 2 ** attempt,
        RETRY_CONFIG.maxDelay
      );

      logger.warn(
        `[AUTH] Retry attempt ${attempt + 1}/${
          RETRY_CONFIG.maxRetries
        } for ${operation} after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create a new user account
 */
export function createAccount(
  email: string,
  password: string,
  name?: string
): Promise<Models.User<Models.Preferences>> {
  return retryWithBackoff(async () => {
    const { users } = createAdminClient();
    const userId = ID.unique();

    try {
      const user = await users.create(userId, email, undefined, password, name);
      return user;
    } catch (error) {
      throw handleAppwriteError(error);
    }
  }, "createAccount");
}

/**
 * Create an email/password session (login)
 * Simplified approach: Just create the session and return it
 * The session created by the client SDK is valid and can be used directly
 */
export function createEmailSession(
  email: string,
  password: string
): Promise<Models.Session> {
  return retryWithBackoff(async () => {
    const config = getAppwriteConfig();
    let clientSession: Models.Session;

    // Step 1: Verify credentials using Client SDK
    try {
      const { Client: WebClient, Account: WebAccount } = await import("appwrite");
      
      const client = new WebClient()
        .setEndpoint(config.endpoint)
        .setProject(config.projectId);

      const account = new WebAccount(client);

      // This creates a session but in SSR it might lack the secret
      clientSession = await account.createEmailPasswordSession(email, password) as unknown as Models.Session;
    } catch (error) {
      logger.error("[AUTH] Step 1 Failed (Invalid Credentials):", error);
      throw handleAppwriteError(error);
    }

    // Step 2: Create valid session with Admin SDK
    try {
      const { users } = createAdminClient();
      const adminSession = await users.createSession(clientSession.userId);

      // Cleanup: Delete the temporary client session
      try {
        const { users: adminUsers } = createAdminClient();
        await adminUsers.deleteSession(clientSession.userId, clientSession.$id);
      } catch (cleanupError) {
        logger.warn("[AUTH] Failed to cleanup temporary session:", cleanupError);
      }

      return adminSession;
    } catch (error) {
      logger.error("[AUTH] Step 2 Failed (Admin Session Creation):", error);
      console.error("[CRITICAL AUTH ERROR] Failed to create session via Admin SDK. Check API Key permissions (users.write).", error);
      throw handleAppwriteError(error);
    }
  }, "createEmailSession");
}

/**
 * Delete a session (logout)
 */
export function deleteSession(sessionId: string): Promise<void> {
  return retryWithBackoff(async () => {
    const { account } = createSessionClient(sessionId);

    try {
      await account.deleteSession(sessionId);
    } catch (error) {
      throw handleAppwriteError(error);
    }
  }, "deleteSession");
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(
  session?: string
): Promise<Models.User<Models.Preferences> | null> {
  try {
    const { account } = session
      ? createSessionClient(session)
      : createAdminClient();

    const user = await account.get();
    return user;
  } catch (error) {
    const authError = handleAppwriteError(error);

    // Return null for session expired or user not found
    if (
      authError.code === AuthErrorCode.SESSION_EXPIRED ||
      authError.code === AuthErrorCode.USER_NOT_FOUND ||
      authError.code === AuthErrorCode.INVALID_CREDENTIALS
    ) {
      return null;
    }

    throw authError;
  }
}

/**
 * Get the current session
 */
export async function getSession(
  sessionId?: string
): Promise<Models.Session | null> {
  try {
    const { account } = sessionId
      ? createSessionClient(sessionId)
      : createAdminClient();

    // When sessionId is provided, we create a session client that's already authenticated
    // with that session, so we should always use "current" to get the session
    const session = await account.getSession("current");

    return session;
  } catch (error) {
    const authError = handleAppwriteError(error);

    // Return null for session expired or not found
    if (
      authError.code === AuthErrorCode.SESSION_EXPIRED ||
      authError.code === AuthErrorCode.USER_NOT_FOUND ||
      authError.code === AuthErrorCode.INVALID_CREDENTIALS
    ) {
      return null;
    }

    throw authError;
  }
}

/**
 * Refresh the current session to extend its expiration
 * Appwrite automatically extends the session when accessed
 */
export function refreshSession(sessionId: string): Promise<Models.Session> {
  return retryWithBackoff(async () => {
    const { account } = createSessionClient(sessionId);

    try {
      // Appwrite extends session expiration when we access it
      // Getting the session is sufficient to refresh it
      const session = await account.getSession("current");

      logger.log(
        `[auth] Session refreshed successfully. New expiration: ${session.expire}`
      );

      return session;
    } catch (error) {
      throw handleAppwriteError(error);
    }
  }, "refreshSession");
}

/**
 * Validate session and return user if valid
 */
export async function validateSession(sessionId: string): Promise<{
  user: Models.User<Models.Preferences>;
  session: Models.Session;
} | null> {
  try {
    const session = await getSession(sessionId);
    if (!session) {
      return null;
    }

    const user = await getCurrentUser(sessionId);
    if (!user) {
      return null;
    }

    return { user, session };
  } catch (error) {
    const authError = handleAppwriteError(error);
    logAuthError(authError, {
      operation: "validateSession",
      timestamp: new Date(),
    });
    return null;
  }
}

/**
 * Create a verification email for the current user
 * This requires an active session
 */
export function createVerification(
  sessionId: string,
  verificationUrl: string
): Promise<Models.Token> {
  return retryWithBackoff(async () => {
    try {
      const config = getAppwriteConfig();
      
      // Use Client SDK for verification to ensure consistency with session handling
      const { Client: WebClient, Account: WebAccount } = await import("appwrite");

      const client = new WebClient()
        .setEndpoint(config.endpoint)
        .setProject(config.projectId)
        .setSession(sessionId); // sessionId here is the secret

      const account = new WebAccount(client);

      const token = await account.createVerification(verificationUrl);
      logger.log("[AUTH] Verification email sent successfully");
      return token as unknown as Models.Token;
    } catch (error) {
      logger.error("[AUTH] Failed to send verification email:", error);
      throw handleAppwriteError(error);
    }
  }, "createVerification");
}
