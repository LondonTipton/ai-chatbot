/**
 * Production-safe logging utility
 * - Full logs in development (local)
 * - Suppressed logs in production (Vercel)
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Safe console.log - only logs in development
 */
export function log(...args: any[]) {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Safe console.error - always logs but sanitizes in production
 */
export function error(...args: any[]) {
  if (isDevelopment) {
    console.error(...args);
  } else {
    // In production, log errors but sanitize sensitive data
    const sanitized = args.map((arg) => {
      if (typeof arg === "string") {
        return sanitizeString(arg);
      }
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: sanitizeString(arg.message),
          // Don't include stack traces in production logs
        };
      }
      return "[redacted]";
    });
    console.error(...sanitized);
  }
}

/**
 * Safe console.warn - only logs in development
 */
export function warn(...args: any[]) {
  if (isDevelopment) {
    console.warn(...args);
  }
}

/**
 * Safe console.info - only logs in development
 */
export function info(...args: any[]) {
  if (isDevelopment) {
    console.info(...args);
  }
}

/**
 * Safe console.debug - only logs in development
 */
export function debug(...args: any[]) {
  if (isDevelopment) {
    console.debug(...args);
  }
}

/**
 * Sanitize strings by removing potential sensitive data patterns
 */
function sanitizeString(str: string): string {
  return str
    .replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, "[email]")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "[uuid]"
    )
    .replace(/\b[0-9a-f]{32,}\b/gi, "[token]")
    .replace(/session[_-]?id[=:]\s*[^\s,}]+/gi, "sessionId=[redacted]")
    .replace(/user[_-]?id[=:]\s*[^\s,}]+/gi, "userId=[redacted]");
}

/**
 * Create a namespaced logger for specific modules
 */
export function createLogger(namespace: string) {
  return {
    log: (...args: any[]) => log(`[${namespace}]`, ...args),
    error: (...args: any[]) => error(`[${namespace}]`, ...args),
    warn: (...args: any[]) => warn(`[${namespace}]`, ...args),
    info: (...args: any[]) => info(`[${namespace}]`, ...args),
    debug: (...args: any[]) => debug(`[${namespace}]`, ...args),
  };
}
