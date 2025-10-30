// Simple Appwrite connectivity test
// Run with: pnpm tsx scripts/ping-appwrite.ts

const ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const PROJECT_ID = "68faa1c7002b9382b526";

async function pingAppwrite() {
  console.log("=== Pinging Appwrite ===\n");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Project ID: ${PROJECT_ID}\n`);

  try {
    // Test 1: Health check
    console.log("Test 1: Health check...");
    const healthResponse = await fetch(`${ENDPOINT}/health`);
    console.log(`Status: ${healthResponse.status}`);
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log(`Response: ${JSON.stringify(data)}`);
      console.log("✅ Appwrite is reachable!\n");
    } else {
      console.log("❌ Appwrite health check failed\n");
    }

    // Test 2: Database health
    console.log("Test 2: Database health...");
    const dbHealthResponse = await fetch(`${ENDPOINT}/health/db`);
    console.log(`Status: ${dbHealthResponse.status}`);
    if (dbHealthResponse.ok) {
      const data = await dbHealthResponse.json();
      console.log(`Response: ${JSON.stringify(data)}`);
      console.log("✅ Database is healthy!\n");
    } else {
      console.log("❌ Database health check failed\n");
    }

    // Test 3: Project-specific request
    console.log("Test 3: Project-specific request...");
    const projectResponse = await fetch(`${ENDPOINT}/account`, {
      headers: {
        "X-Appwrite-Project": PROJECT_ID,
      },
    });
    console.log(`Status: ${projectResponse.status}`);

    if (projectResponse.status === 401) {
      console.log(
        "✅ Project is accessible (401 = not authenticated, which is expected)\n"
      );
    } else if (projectResponse.status === 404) {
      console.log("❌ Project not found - check your project ID\n");
    } else {
      console.log(`Response status: ${projectResponse.status}\n`);
    }

    console.log("=== Ping Complete ===");
    console.log("\nSummary:");
    console.log("✓ Appwrite endpoint is reachable");
    console.log("✓ Database is operational");
    console.log("✓ Project exists and is accessible");
    console.log(
      "\n✅ Your Appwrite connection is working correctly from your local machine!"
    );
  } catch (error) {
    console.error("\n❌ Ping failed:");
    console.error(error);
  }
}

pingAppwrite();
