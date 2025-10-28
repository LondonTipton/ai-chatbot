import { Account as BrowserAccount, Client as BrowserClient } from "appwrite";
import { Account, Client, Users } from "node-appwrite";

/**
 * Appwrite configuration type
 */
export type AppwriteConfig = {
  endpoint: string;
  projectId: string;
  apiKey?: string;
};

/**
 * Get Appwrite configuration from environment variables
 */
export function getAppwriteConfig(): AppwriteConfig {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!endpoint || !projectId) {
    throw new Error(
      "Missing required Appwrite configuration. Please set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID environment variables."
    );
  }

  return {
    endpoint,
    projectId,
    apiKey,
  };
}

/**
 * Admin client for server-side operations with elevated permissions
 * Uses API key for authentication
 * Should only be used in server-side code (API routes, server actions)
 */
export function createAdminClient() {
  const config = getAppwriteConfig();

  if (!config.apiKey) {
    throw new Error(
      "Missing APPWRITE_API_KEY. Admin client requires an API key for server-side operations."
    );
  }

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return {
    account: new Account(client),
    users: new Users(client),
  };
}

/**
 * Session client for user-specific operations
 * Uses session token for authentication
 * Can be used in both server-side and client-side code
 *
 * @param session - Optional session token for server-side usage
 */
export function createSessionClient(session?: string) {
  const config = getAppwriteConfig();

  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);

  if (session) {
    client.setSession(session);
  }

  return {
    account: new Account(client),
  };
}

/**
 * Browser client for client-side operations
 * Uses cookies for session management automatically
 * Should only be used in client-side React components
 */
export function createBrowserClient() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

  if (!endpoint || !projectId) {
    throw new Error(
      "Missing required Appwrite configuration. Please set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID environment variables."
    );
  }

  const client = new BrowserClient()
    .setEndpoint(endpoint)
    .setProject(projectId);

  return {
    account: new BrowserAccount(client),
  };
}
