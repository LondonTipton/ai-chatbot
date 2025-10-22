import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

const INTEGRATION_KEY = process.env.PESEPAY_INTEGRATION_KEY || "";
const BASE_URL = "https://api.pesepay.com/api/payments-engine";

async function checkCurrencies() {
  const headers = {
    key: INTEGRATION_KEY,
    "Content-Type": "application/json",
  };

  console.log("Checking active currencies...\n");

  try {
    const response = await axios.get(`${BASE_URL}/v1/currencies/active`, {
      headers,
      insecureHTTPParser: true,
    });
    console.log("Active currencies:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("Error fetching currencies:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
  }
}

async function checkPaymentMethods(currencyCode: string) {
  const headers = {
    key: INTEGRATION_KEY,
    "Content-Type": "application/json",
  };

  console.log(`\nChecking payment methods for ${currencyCode}...\n`);

  try {
    const response = await axios.get(
      `${BASE_URL}/v1/payment-methods/for-currency?currencyCode=${currencyCode}`,
      { headers, insecureHTTPParser: true }
    );
    console.log(
      `Payment methods for ${currencyCode}:`,
      JSON.stringify(response.data, null, 2)
    );
  } catch (error: any) {
    console.error(`Error fetching payment methods for ${currencyCode}:`);
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
  }
}

async function main() {
  await checkCurrencies();
  await checkPaymentMethods("USD");
  await checkPaymentMethods("ZWL");
}

main();
