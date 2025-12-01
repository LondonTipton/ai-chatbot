import dotenv from "dotenv";
import { Account, Client, ID, Users } from "node-appwrite";

dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const API_KEY = process.env.APPWRITE_API_KEY;

if (!PROJECT_ID || !ENDPOINT || !API_KEY) {
  console.error("Missing config");
  process.exit(1);
}

async function main() {
  console.log("--- Debugging Appwrite Login ---");
  console.log("Endpoint:", ENDPOINT);
  console.log("Project ID:", PROJECT_ID);

  // 1. Create a test user using Admin SDK
  const clientAdmin = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

  const users = new Users(clientAdmin);
  const email = `test.${Date.now()}@example.com`;
  const password = "password123456";
  const name = "Test User";

  console.log(`\n1. Creating test user: ${email}`);
  let user;
  try {
    user = await users.create(ID.unique(), email, undefined, password, name);
    console.log("User created:", user.$id);
  } catch (e) {
    console.error("Failed to create user:", e);
    return;
  }

  // 2. Login using node-appwrite Account service (Client mode - no API key)
  console.log("\n2. Testing node-appwrite login...");
  try {
    const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
    // No API Key for client operations

    const account = new Account(client);
    const session = await account.createEmailPasswordSession(email, password);

    console.log("Session created via SDK:");
    console.log("ID:", session.$id);
    console.log("Secret length:", session.secret?.length || 0);
    console.log(
      "Secret:",
      session.secret ? session.secret.substring(0, 5) + "..." : "MISSING"
    );
  } catch (e) {
    console.error("SDK Login failed:", e);
  }

  // 3. Login using raw fetch
  console.log("\n3. Testing raw fetch login...");
  try {
    const response = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": PROJECT_ID,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    console.log("Fetch status:", response.status);
    if (response.ok) {
      console.log("Session created via Fetch:");
      console.log("ID:", data.$id);
      console.log("Secret length:", data.secret?.length || 0);
      console.log(
        "Secret:",
        data.secret ? data.secret.substring(0, 5) + "..." : "MISSING"
      );
    } else {
      console.log("Fetch error:", data);
    }
  } catch (e) {
    console.error("Fetch Login failed:", e);
  }

  // Cleanup
  console.log("\n4. Cleaning up...");
  try {
    await users.delete(user.$id);
    console.log("Test user deleted.");
  } catch (e) {
    console.error("Failed to delete user:", e);
  }
}

main();
