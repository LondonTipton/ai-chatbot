// Test Pesepay API with and without encryption
const axios = require("axios");
const { createCipheriv } = require("crypto");
const { Buffer } = require("buffer");

const integrationKey = "6263baa6-7a52-4a90-8ed0-fbc149a0b87f";
const encryptionKey = "e16c46c66cdc41288c7f859bcf33cf31";

function payloadEncrypt(payload: string, key: string) {
  const iv = Buffer.from(key.substr(0, 16), "utf8");
  const keyBuffer = Buffer.from(key, "utf8");
  const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
  return cipher.update(payload, "utf8", "base64") + cipher.final("base64");
}

async function testWithoutEncryption() {
  console.log("=== TEST 1: WITHOUT ENCRYPTION ===\n");

  const paymentData = {
    currencyCode: "USD",
    paymentMethodCode: "PZW211",
    amount: 10,
    reasonForPayment: "Test payment",
    resultUrl: "http://localhost:3000/api/payment/callback",
    returnUrl: "http://localhost:3000/payment/status",
    customer: {
      email: "test@example.com",
      phoneNumber: "0789787583",
      name: "Test User",
    },
  };

  console.log("Payment data:", JSON.stringify(paymentData, null, 2));

  const headers = {
    key: integrationKey,
    "Content-Type": "application/json",
  };

  console.log("\nSending unencrypted request...");

  try {
    const response = await axios.post(
      "https://api.pesepay.com/api/payments-engine/v2/payments/make-payment",
      paymentData, // Send raw data
      {
        headers,
        insecureHTTPParser: true,
      }
    );

    console.log("✓ Success!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("✗ Error:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testWithEncryption() {
  console.log("\n\n=== TEST 2: WITH ENCRYPTION ===\n");

  const paymentData = {
    currencyCode: "USD",
    paymentMethodCode: "PZW211",
    amount: 10,
    reasonForPayment: "Test payment",
    resultUrl: "http://localhost:3000/api/payment/callback",
    returnUrl: "http://localhost:3000/payment/status",
    customer: {
      email: "test@example.com",
      phoneNumber: "0789787583",
      name: "Test User",
    },
  };

  console.log(
    "Payment data (before encryption):",
    JSON.stringify(paymentData, null, 2)
  );

  const encryptedPayload = payloadEncrypt(
    JSON.stringify(paymentData),
    encryptionKey
  );
  console.log("\nEncrypted payload length:", encryptedPayload.length);

  const requestBody = {
    payload: encryptedPayload,
  };

  const headers = {
    key: integrationKey,
    "Content-Type": "application/json",
  };

  console.log("\nSending encrypted request...");

  try {
    const response = await axios.post(
      "https://api.pesepay.com/api/payments-engine/v2/payments/make-payment",
      requestBody,
      {
        headers,
        insecureHTTPParser: true,
      }
    );

    console.log("✓ Success!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("✗ Error:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runTests() {
  await testWithoutEncryption();
  await testWithEncryption();

  console.log("\n\n=== SUMMARY ===");
  console.log(
    "Both tests completed. Check the responses above to see which format works."
  );
}

runTests();
