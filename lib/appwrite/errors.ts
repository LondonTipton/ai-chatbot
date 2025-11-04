import { AppwriteException } from "node-appwrite";
import { createLogger } from "@/lib/logger";

const logger = createLogger("appwrite/errors");

/**
 * Authentication error codes
 */
export const AuthErrorCode = {
  INVALID_CREDENTIALS: "invalid_credentials",
  USER_EXISTS: "user_exists",
  USER_NOT_FOUND: "user_not_found",
  SESSION_EXPIRED: "session_expired",
  NETWORK_ERROR: "network_error",
  RATE_LIMITED: "rate_limited",
  INVALID_INPUT: "invalid_input",
  APPWRITE_ERROR: "appwrite_error",
  UNKNOWN_ERROR: "unknown_error",
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

/**
 * Custom authentication error class
 */
export class AuthError extends Error {
  code: AuthErrorCode;
  details?: any;
  originalError?: Error;

  constructor(
    code: AuthErrorCode,
    message: string,
    details?: any,
    originalError?: Error
  ) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.details = details;
    this.originalError = originalError;
  }
}

/**
 * Map Appwrite error codes to application error codes
 */
function mapAppwriteErrorCode(appwriteCode: number): AuthErrorCode {
  switch (appwriteCode) {
    case 401: // Unauthorized
      return AuthErrorCode.INVALID_CREDENTIALS;
    case 409: // Conflict (user already exists)
      return AuthErrorCode.USER_EXISTS;
    case 404: // Not found
      return AuthErrorCode.USER_NOT_FOUND;
    case 429: // Too many requests
      return AuthErrorCode.RATE_LIMITED;
    case 400: // Bad request
      return AuthErrorCode.INVALID_INPUT;
    default:
      return AuthErrorCode.APPWRITE_ERROR;
  }
}

/**
 * Get user-friendly error message for error code
 */
function getUserFriendlyMessage(code: AuthErrorCode): string {
  switch (code) {
    case AuthErrorCode.INVALID_CREDENTIALS:
      return "Invalid email or password. Please try again.";
    case AuthErrorCode.USER_EXISTS:
      return "An account with this email already exists.";
    case AuthErrorCode.USER_NOT_FOUND:
      return "No account found with this email.";
    case AuthErrorCode.SESSION_EXPIRED:
      return "Your session has expired. Please log in again.";
    case AuthErrorCode.NETWORK_ERROR:
      return "Network error. Please check your connection and try again.";
    case AuthErrorCode.RATE_LIMITED:
      return "Too many attempts. Please try again later.";
    case AuthErrorCode.INVALID_INPUT:
      return "Invalid input. Please check your information and try again.";
    case AuthErrorCode.APPWRITE_ERROR:
      return "Authentication service error. Please try again later.";
    case AuthErrorCode.UNKNOWN_ERROR:
      return "An unexpected error occurred. Please try again.";
    default:
      return "An error occurred. Please try again.";
  }
}

/**
 * Convert Appwrite exception to AuthError
 */
export function handleAppwriteError(error: unknown): AuthError {
  // Handle Appwrite exceptions
  if (error instanceof AppwriteException) {
    const code = mapAppwriteErrorCode(error.code);
    const message = getUserFriendlyMessage(code);

    return new AuthError(code, message, { appwriteCode: error.code }, error);
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new AuthError(
      AuthErrorCode.NETWORK_ERROR,
      getUserFriendlyMessage(AuthErrorCode.NETWORK_ERROR),
      undefined,
      error as Error
    );
  }

  // Handle generic errors
  if (error instanceof Error) {
    return new AuthError(
      AuthErrorCode.UNKNOWN_ERROR,
      getUserFriendlyMessage(AuthErrorCode.UNKNOWN_ERROR),
      undefined,
      error
    );
  }

  // Handle unknown error types
  return new AuthError(
    AuthErrorCode.UNKNOWN_ERROR,
    getUserFriendlyMessage(AuthErrorCode.UNKNOWN_ERROR),
    { originalError: error }
  );
}

/**
 * Error logging context
 */
export type ErrorLogContext = {
  userId?: string;
  email?: string;
  operation: string;
  path?: string;
  method?: string;
  userAgent?: string;
  timestamp: Date;
};

/**
 * Log authentication error with context
 */
export function logAuthError(error: AuthError, context: ErrorLogContext): void {
  const logData = {
    timestamp: context.timestamp.toISOString(),
    errorCode: error.code,
    message: error.message,
    operation: context.operation,
    userId: context.userId,
    email: context.email,
    path: context.path,
    method: context.method,
    userAgent: context.userAgent,
    details: error.details,
    stack: error.originalError?.stack,
  };

  // Log based on error severity
  if (
    error.code === AuthErrorCode.NETWORK_ERROR ||
    error.code === AuthErrorCode.APPWRITE_ERROR ||
    error.code === AuthErrorCode.UNKNOWN_ERROR
  ) {
    logger.error("[AUTH ERROR]", JSON.stringify(logData, null, 2));
  } else {
    logger.warn("[AUTH WARNING]", JSON.stringify(logData, null, 2));
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AuthError): boolean {
  return (
    error.code === AuthErrorCode.NETWORK_ERROR ||
    error.code === AuthErrorCode.APPWRITE_ERROR
  );
}
