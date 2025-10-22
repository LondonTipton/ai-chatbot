#!/usr/bin/env tsx

/**
 * Simple script to test PesePay API endpoints
 * Run with: pnpm tsx scripts/test-pesepay.ts
 */

const BASE_URL = "http://localhost:3000";

async function testEndpoint(name: string, url: string) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 URL: ${url}\n`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
      console.log("✅ Success!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log("❌ Failed!");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 PesePay API Test Suite");
  console.log("=".repeat(60));

  // Test 1: Get active currencies
  await testEndpoint(
    "Get Active Currencies",
    `${BASE_URL}/api/payment/test-pesepay`
  );

  // Test 2: Get payment methods
  await testEndpoint(
    "Get Payment Methods (USD)",
    `${BASE_URL}/api/payment/test-fetch`
  );

  // Test 3: Full integration test
  await testEndpoint(
    "Full Integration Test",
    `${BASE_URL}/api/payment/test-initiate`
  );

  console.log("\n" + "=".repeat(60));
  console.log("✨ Test suite complete!");
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
