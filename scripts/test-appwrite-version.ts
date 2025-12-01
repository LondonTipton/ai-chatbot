/**
 * Test Appwrite Function Version
 * Checks if the deployed function supports the new 'reportError' action
 * Run with: npx tsx scripts/test-appwrite-version.ts
 */

import { resolve } from "node:path";
import dotenv from "dotenv";
import { Client, Functions } from "node-appwrite";

dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function testFunctionVersion() {
  console.log("🔍 Testing Appwrite Function Version...\n");

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const functionId = process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID_LOAD_BALANCER;

  if (!endpoint || !projectId || !apiKey || !functionId) {
    console.error("❌ Missing configuration");
    return;
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new Functions(client);

  try {
    console.log("   Sending 'reportError' request...");
    const execution = await functions.createExecution(
      functionId,
      JSON.stringify({
        action: "reportError",
        provider: "cerebras",
        keyId: "test-key-verification",
        errorType: "other", // Should just log and return success
      })
    );

    if (execution.status === "completed") {
      const response = JSON.parse(execution.responseBody);
      console.log("   Response:", response);

      if (response.action === "logged_error") {
        console.log("   ✅ Function is running the NEW code!");
      } else {
        console.log("   ⚠️ Function returned unexpected response (Old code?)");
        console.log("   Body:", execution.responseBody);
      }
    } else {
      console.log(`   ❌ Execution failed: ${execution.status}`);
      console.error(execution.responseBody);
    }
  } catch (error: any) {
    console.error("   ❌ Error calling function:", error.message);
  }
}

testFunctionVersion();
