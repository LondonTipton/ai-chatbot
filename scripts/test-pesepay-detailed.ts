// Detailed test to see what's being sent to Pesepay
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

async function testDirectAPI() {
  // Create the payment object manually
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
  console.log(
    "Encrypted payload (first 50 chars):",
    encryptedPayload.substring(0, 50) + "..."
  );

  const requestBody = {
    payload: encryptedPayload,
  };

  const headers = {
    key: integrationKey,
    "Content-Type": "application/json",
  };

  console.log("\nRequest headers:", headers);
  console.log(
    "\nSending request to: https://api.pesepay.com/api/payments-engine/v2/payments/make-payment"
  );

  try {
    const response = await axios.post(
      "https://api.pesepay.com/api/payments-engine/v2/payments/make-payment",
      requestBody,
      {
        headers,
        insecureHTTPParser: true,
      }
    );

    console.log("\n✓ Success!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("\n✗ Error:", error.message);

    if (error.response) {
      console.error("\nResponse status:", error.response.status);
      console.error("Response headers:", error.response.headers);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

testDirectAPI();
