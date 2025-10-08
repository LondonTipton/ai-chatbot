// Centralized AUTH_SECRET for edge runtime compatibility
// Next.js with Turbopack has issues loading .env.local in edge runtime
// This ensures the secret is available everywhere
export const AUTH_SECRET = process.env.AUTH_SECRET || "";
