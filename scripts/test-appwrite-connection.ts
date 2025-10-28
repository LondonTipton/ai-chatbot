import { Account, Client } from "node-appwrite";

async function testAppwriteConnection() {
  console.log("Testing Appwrite connection...");

  // Hardcode for testing
  const endpoint = "https://cloud.appwrite.io/v1";
  const projectId = "68faa1c7002b9382b526";

  console.log("Endpoint:", endpoint);
  console.log("Project ID:", projectId);

  if (!endpoint || !projectId) {
    console.error("Missing Appwrite configuration");
    process.exit(1);
  }

  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId);

    const account = new Account(client);

    console.log("Attempting to create session...");

    // Try to create a session with test credentials
    const email = "chidzawoa@gmail.com";
    const password = "your-password-here"; // Replace with actual password

    const session = await account.createEmailPasswordSession(email, password);

    console.log("✅ Session created successfully!");
    console.log("Session ID:", session.$id);
    console.log("Session secret:", session.secret?.substring(0, 20) + "...");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testAppwriteConnection();
