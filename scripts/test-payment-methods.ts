// Test to get actual payment method codes from Pesepay
const axios = require("axios");

const integrationKey = "6263baa6-7a52-4a90-8ed0-fbc149a0b87f";

async function getPaymentMethods() {
  console.log("Fetching payment methods for USD...\n");

  try {
    const response = await axios.get(
      "https://api.pesepay.com/api/payments-engine/v1/payment-methods/for-currency?currencyCode=USD",
      {
        headers: {
          key: integrationKey,
          "Content-Type": "application/json",
        },
        insecureHTTPParser: true,
      }
    );

    console.log("✓ Success!");
    console.log("Payment methods:", JSON.stringify(response.data, null, 2));

    if (Array.isArray(response.data)) {
      console.log("\n=== Available Payment Method Codes ===");
      response.data.forEach((method: any) => {
        console.log(
          `- ${method.code}: ${method.name} (${method.minAmount}-${method.maxAmount})`
        );
      });
    }
  } catch (error: any) {
    console.error("✗ Error:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Response:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

getPaymentMethods();
