// Test with the exact structure the Pesepay package uses
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

async function testCorrectStructure() {
  console.log("=== Testing with Correct Payment Object Structure ===\n");

  // This is what the Pesepay package creates
  const paymentObject = {
    currencyCode: "USD",
    paymentMethodCode: "PZW211",
    customer: {
      email: "test@example.com",
      phoneNumber: "0789787583",
      name: "Test User",
    },
    resultUrl: "http://localhost:3000/api/payment/callback",
    returnUrl: "http://localhost:3000/payment/status",
    reasonForPayment: "Test payment",
    amountDetails: {
      amount: 10,
      currencyCode: "USD",
    },
    paymentMethodRequiredFields: {
      customerPhoneNumber: "0789787583",
    },
    paymentRequestFields: {
      customerPhoneNumber: "0789787583",
    },
  };

  console.log("Payment object:", JSON.stringify(paymentObject, null, 2));

  const encryptedPayload = payloadEncrypt(
    JSON.stringify(paymentObject),
    encryptionKey
  );

  const requestBody = {
    payload: encryptedPayload,
  };

  const headers = {
    key: integrationKey,
    "Content-Type": "application/json",
  };

  console.log("\nSending request...");

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
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCorrectStructure();
