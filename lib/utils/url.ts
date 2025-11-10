/**
 * Get the application URL based on the current environment
 * This allows for seamless switching between local development and production
 */
export function getAppUrl(): string {
  // Check if we're in the browser
  if (typeof window !== "undefined") {
    // In browser, use the current origin
    return window.location.origin;
  }

  // Server-side: use environment variables
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Fallback logic for different environments
  if (envUrl) {
    return envUrl;
  }

  // Production fallback (when deployed)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Netlify fallback
  if (process.env.URL) {
    return process.env.URL;
  }

  // Local development fallback
  return "http://localhost:3000";
}

/**
 * Get the base URL for API calls and redirects
 * This ensures consistent URL handling across environments
 */
export function getBaseUrl(): string {
  return getAppUrl();
}
