import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv } from "node:crypto";
import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

const INTEGRATION_KEY = process.env.PESEPAY_INTEGRATION_KEY || "";
const ENCRYPTION_KEY = process.env.PESEPAY_ENCRYPTION_KEY || "";
const BASE_URL = "https://api.pesepay.com/api/payments-engine";

console.log("Integration Key:", INTEGRATION_KEY ? "Set" : "Missing");
console.log("Encryption Key:", ENCRYPTION_KEY ? "Set" : "Missing");

function payloadEncrypt(payload: string, key: string) {
  const iv = Buffer.from(key.substring(0, 16), "utf8");
  const keyBuffer = Buffer.from(key, "utf8");
  const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
  return cipher.update(payload, "utf8", "base64") + cipher.final("base64");
}

function payloadDecrypt(payload: string, key: string) {
  const iv = Buffer.from(key.substring(0, 16), "utf8");
  const keyBuffer = Buffer.from(key, "utf8");
  const decipher = createDecipheriv("aes-256-cbc", keyBuffer, iv);
  return decipher.update(payload, "base64", "utf8") + decipher.final("utf8");
}

async function testSeamlessPayment() {
  const payment = {
    currencyCode: "USD",
    paymentMethodCode: "PZW211", // Correct Ecocash USD code
    customer: {
      email: "test@example.com",
      phoneNumber: "0789787583",
      name: "Test User",
    },
    reasonForPayment: "Test Payment - $30",
    amountDetails: {
      amount: 30,
      currencyCode: "USD",
    },
    returnUrl: "http://localhost:3000/payment/status",
    resultUrl: "http://localhost:3000/api/payment/callback",
    paymentMethodRequiredFields: {
      customerPhoneNumber: "0789787583",
    },
    paymentRequestFields: {
      customerPhoneNumber: "0789787583",
    },
  };

  console.log("Payment object:", JSON.stringify(payment, null, 2));

  const payload = payloadEncrypt(JSON.stringify(payment), ENCRYPTION_KEY);
  console.log("\nEncrypted payload length:", payload.length);

  const headers = {
    key: INTEGRATION_KEY,
    "Content-Type": "application/json",
  };

  try {
    console.log("\nMaking request to:", `${BASE_URL}/v2/payments/make-payment`);
    const response = await axios.post(
      `${BASE_URL}/v2/payments/make-payment`,
      { payload },
      { headers, insecureHTTPParser: true }
    );
    console.log("\nSuccess response:", response.data);

    // Decrypt the response
    if (response.data.payload) {
      const decrypted = payloadDecrypt(response.data.payload, ENCRYPTION_KEY);
      console.log("\nDecrypted response:", JSON.parse(decrypted));
    }
  } catch (error: any) {
    console.error("\nError occurred:");
    console.error("Status:", error.response?.status);
    console.error("Status Text:", error.response?.statusText);
    console.error("Headers:", error.response?.headers);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
  }
}

testSeamlessPayment();
