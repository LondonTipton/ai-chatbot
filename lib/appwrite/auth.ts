import { Account, Client, ID, type Models } from "node-appwrite";
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
 * Note: This uses the admin client to create a session for the user
 * The session token is returned and should be set as a cookie
 */
export function createEmailSession(
  email: string,
  password: string
): Promise<Models.Session> {
  return retryWithBackoff(async () => {
    try {
      logger.log("[AUTH] Creating email session for:", email);

      // Create a fresh client without any session or API key
      // This allows email/password authentication
      const config = getAppwriteConfig();

      logger.log("[AUTH] Config loaded, endpoint:", config.endpoint);

      const client = new Client()
        .setEndpoint(config.endpoint)
        .setProject(config.projectId);

      const account = new Account(client);

      logger.log("[AUTH] Calling Appwrite createEmailPasswordSession...");

      // This will verify the password and create a session
      const session = await account.createEmailPasswordSession(email, password);

      logger.log("[AUTH] Session created successfully:", session.$id);
      logger.log("[AUTH] Session object keys:", Object.keys(session));
      logger.log("[AUTH] Session secret:", session.secret);
      logger.log("[AUTH] Session provider:", session.provider);
      logger.log("[AUTH] Session userId:", session.userId);
      logger.log(
        "[AUTH] Full session object:",
        JSON.stringify(session, null, 2)
      );

      return session;
    } catch (error) {
      logger.error("[AUTH] Error creating session:", error);
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

    const session = await account.getSession(sessionId || "current");
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
    const { account } = createSessionClient(sessionId);

    try {
      const token = await account.createVerification(verificationUrl);
      logger.log("[AUTH] Verification email sent successfully");
      return token;
    } catch (error) {
      logger.error("[AUTH] Failed to send verification email:", error);
      throw handleAppwriteError(error);
    }
  }, "createVerification");
}
