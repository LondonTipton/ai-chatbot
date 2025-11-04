"use server";

import { z } from "zod";
import {
  createAccount,
  createEmailSession,
  deleteSession,
} from "@/lib/appwrite/auth";
import { type AuthError, AuthErrorCode } from "@/lib/appwrite/errors";
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from "@/lib/appwrite/session";
import { createUserWithAppwriteId, getUser } from "@/lib/db/queries";
import { createLogger } from "@/lib/logger";

const logger = createLogger("(auth)/actions");

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginActionState = {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
  error?: string;
};

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    logger.log("[LOGIN] Starting login process");

    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    logger.log("[LOGIN] Validation passed, creating session");

    // Create Appwrite session
    const session = await createEmailSession(
      validatedData.email,
      validatedData.password
    );

    logger.log("[LOGIN] Session created:", session.$id);
    logger.log("[LOGIN] Session secret available:", !!session.secret);

    // Check if user exists in local database and sync Appwrite ID if needed
    const [dbUser] = await getUser(validatedData.email);
    if (dbUser && !dbUser.appwriteId) {
      logger.log(
        "[LOGIN] User exists but missing Appwrite ID, syncing:",
        session.userId
      );
      const { updateUserAppwriteId } = await import("@/lib/db/queries");
      await updateUserAppwriteId(dbUser.id, session.userId);
    } else if (!dbUser) {
      // User doesn't exist in database yet, create them
      logger.log("[LOGIN] User not in database, creating:", session.userId);
      await createUserWithAppwriteId(validatedData.email, session.userId);
    }

    // Set session cookie with the session secret (not the ID!)
    // The secret is the actual session token that Appwrite uses for authentication
    await setSessionCookie(session.$id, session.secret, session.userId);

    logger.log("[LOGIN] Session cookie set, login successful");

    return { status: "success" };
  } catch (error) {
    logger.error("[LOGIN] Error during login:", error);
    if (error instanceof z.ZodError) {
      return { status: "invalid_data", error: "Invalid email or password" };
    }

    // Handle Appwrite errors
    const authError = error as AuthError;
    if (authError.code === AuthErrorCode.INVALID_CREDENTIALS) {
      return {
        status: "failed",
        error: "Invalid email or password",
      };
    }

    if (authError.code === AuthErrorCode.RATE_LIMITED) {
      return {
        status: "failed",
        error:
          "Too many login attempts. Please wait 5-10 minutes and try again.",
      };
    }

    return {
      status: "failed",
      error:
        authError.message ||
        "An error occurred during login. Please try again.",
    };
  }
};

export type RegisterActionState = {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data";
  error?: string;
};

export const register = async (
  _: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    // Check if user already exists in local database
    const [existingUser] = await getUser(validatedData.email);

    if (existingUser) {
      return {
        status: "user_exists",
        error: "An account with this email already exists",
      };
    }

    // Create Appwrite account
    const appwriteUser = await createAccount(
      validatedData.email,
      validatedData.password
    );

    // Store user in local database with Appwrite ID
    await createUserWithAppwriteId(validatedData.email, appwriteUser.$id);

    // Create session (auto-login)
    const session = await createEmailSession(
      validatedData.email,
      validatedData.password
    );

    // Set session cookie with the session secret (not the ID!)
    await setSessionCookie(session.$id, session.secret, session.userId);

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "invalid_data",
        error: "Invalid email or password format",
      };
    }

    // Handle Appwrite errors
    const authError = error as AuthError;
    if (authError.code === AuthErrorCode.USER_EXISTS) {
      return {
        status: "user_exists",
        error: "An account with this email already exists",
      };
    }

    return {
      status: "failed",
      error: "An error occurred during registration. Please try again.",
    };
  }
};

export const logout = async (): Promise<void> => {
  try {
    const sessionId = await getSessionCookie();

    if (sessionId) {
      // Delete session from Appwrite
      await deleteSession(sessionId);
    }

    // Clear session cookie
    await clearSessionCookie();
  } catch (error) {
    logger.error("[logout] Error during logout:", error);
    // Always clear the cookie even if Appwrite deletion fails
    await clearSessionCookie();
  }
};

export type ResendVerificationActionState = {
  status: "idle" | "in_progress" | "success" | "failed";
  error?: string;
};

export const resendVerification =
  async (): Promise<ResendVerificationActionState> => {
    try {
      logger.log("[RESEND_VERIFICATION] Starting resend verification process");

      // Get the current session
      const sessionId = await getSessionCookie();

      if (!sessionId) {
        return {
          status: "failed",
          error: "No active session. Please log in again.",
        };
      }

      // Import the createVerification function
      const { createVerification } = await import("@/lib/appwrite/auth");

      // Create verification email
      const verificationUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/verify`;
      await createVerification(sessionId, verificationUrl);

      logger.log("[RESEND_VERIFICATION] Verification email sent successfully");

      return { status: "success" };
    } catch (error) {
      logger.error("[RESEND_VERIFICATION] Error:", error);

      const authError = error as AuthError;

      if (authError.code === AuthErrorCode.SESSION_EXPIRED) {
        return {
          status: "failed",
          error: "Your session has expired. Please log in again.",
        };
      }

      if (authError.code === AuthErrorCode.RATE_LIMITED) {
        return {
          status: "failed",
          error: "Too many requests. Please wait a few minutes and try again.",
        };
      }

      return {
        status: "failed",
        error:
          authError.message ||
          "Failed to send verification email. Please try again.",
      };
    }
  };
