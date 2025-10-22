// Test script to verify Pesepay encryption key format
const crypto = require("crypto");

const currentKey = "e16c46c66cdc41288c7f859bcf33cf31";

console.log("Current key analysis:");
console.log("- String length:", currentKey.length);
console.log("- As hex buffer length:", Buffer.from(currentKey, "hex").length);
console.log("- As utf8 buffer length:", Buffer.from(currentKey, "utf8").length);

// Test if it's a valid hex string
const isValidHex = /^[0-9a-fA-F]+$/.test(currentKey);
console.log("- Is valid hex:", isValidHex);

// Generate proper 32-byte key (for AES-256)
const key32 = crypto.randomBytes(32).toString("hex");
console.log("\nGenerated 32-byte key (64 hex chars):", key32);
console.log("Length:", key32.length);

// The Pesepay SDK likely expects the key as provided by them
// Let's test with the actual Pesepay package
try {
  const { Pesepay } = require("pesepay");

  console.log("\n--- Testing with current key ---");
  try {
    const pesepay1 = new Pesepay(
      process.env.PESEPAY_INTEGRATION_KEY,
      currentKey
    );
    console.log("✓ Current key accepted by Pesepay constructor");

    // Try to create a payment to trigger encryption
    const payment = pesepay1.createPayment(
      "USD",
      "PZW211",
      "test@example.com",
      "0771234567",
      "Test User"
    );

    console.log("✓ Payment object created");

    // This will trigger the encryption
    await pesepay1.makeSeamlessPayment(payment, "Test payment", 1, {});

    console.log("✓ Encryption successful with current key");
  } catch (error: any) {
    console.log("✗ Error with current key:", error.message);
    console.log("Error code:", error.code);
  }
} catch (error: any) {
  console.log("Error loading Pesepay package:", error.message);
}
