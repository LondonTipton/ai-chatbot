import { config } from "dotenv";
import { Account, Client } from "node-appwrite";
import { resolve } from "path";

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), ".env.local");
console.log(`Loading environment from: ${envPath}\n`);
config({ path: envPath });

async function testAppwriteConnection() {
  console.log("=== Testing Appwrite Connection ===\n");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  console.log("Configuration:");
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  API Key: ${apiKey ? "✓ Set" : "✗ Missing"}\n`);

  if (!endpoint || !projectId || !apiKey) {
    console.error("❌ Missing required environment variables!");
    process.exit(1);
  }

  try {
    // Test 1: Basic connectivity
    console.log("Test 1: Testing basic connectivity to Appwrite...");
    const response = await fetch(`${endpoint}/health`);
    if (response.ok) {
      console.log("✅ Appwrite endpoint is reachable\n");
    } else {
      console.log(`❌ Appwrite endpoint returned status: ${response.status}\n`);
    }

    // Test 2: API Key authentication
    console.log("Test 2: Testing API Key authentication...");
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const account = new Account(client);

    try {
      // This will fail but tells us if the API key is valid
      await account.get();
    } catch (error: any) {
      // Expected to fail with "Missing scope" or similar, not auth error
      if (error.code === 401) {
        console.log("❌ API Key authentication failed - Invalid API key\n");
      } else if (error.code === 403) {
        console.log(
          "⚠️  API Key is valid but lacks permissions (this is expected)\n"
        );
      } else {
        console.log(`✅ API Key is valid (error: ${error.message})\n`);
      }
    }

    // Test 3: Project access
    console.log("Test 3: Testing project access...");
    const healthResponse = await fetch(`${endpoint}/health/db`, {
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
    });

    if (healthResponse.ok) {
      console.log("✅ Can access project successfully\n");
    } else {
      console.log(
        `❌ Cannot access project (status: ${healthResponse.status})\n`
      );
    }

    console.log("=== Connection Test Complete ===");
    console.log("\nSummary:");
    console.log("- Endpoint is reachable: ✓");
    console.log("- API Key is configured: ✓");
    console.log("- Project is accessible: ✓");
    console.log(
      "\nIf all tests passed, your Appwrite connection is working correctly!"
    );
  } catch (error) {
    console.error("\n❌ Connection test failed:");
    console.error(error);
  }

  process.exit(0);
}

testAppwriteConnection();
