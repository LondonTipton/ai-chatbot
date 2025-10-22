require("dotenv").config({ path: ".env.local" });
const { Pesepay } = require("pesepay");

async function testPesepayPayment() {
  const integrationKey = process.env.PESEPAY_INTEGRATION_KEY;
  const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY;

  console.log("Testing Pesepay payment with credentials:");
  console.log("Integration Key:", integrationKey?.substring(0, 8) + "...");
  console.log("Encryption Key:", encryptionKey?.substring(0, 8) + "...");
  console.log("Encryption Key Length:", encryptionKey?.length);

  const pesepay = new Pesepay(integrationKey, encryptionKey);
  pesepay.resultUrl = "http://localhost:3000/api/payment/callback";
  pesepay.returnUrl = "http://localhost:3000/payment/status";

  // Create payment
  const payment = pesepay.createPayment(
    "USD",
    "PZW211", // Ecocash USD
    "test@example.com",
    "0789787583",
    "Test User"
  );

  console.log("\nPayment object:", {
    currencyCode: payment.currencyCode,
    paymentMethodCode: payment.paymentMethodCode,
    customer: payment.customer,
  });

  try {
    console.log("\nInitiating seamless payment...");
    const response = await pesepay.makeSeamlessPayment(
      payment,
      "Test payment",
      10, // Small amount for testing
      {}
    );

    console.log("\n✓ Success!");
    console.log("Response:", JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error("\n✗ Error:", error.message);

    // Try to get more details from the error
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }

    if (error.config) {
      console.error("\nRequest details:");
      console.error("URL:", error.config.url);
      console.error("Method:", error.config.method);
      console.error("Headers:", error.config.headers);
      // Don't log the full payload as it's encrypted
      console.error("Has payload:", !!error.config.data);
    }
  }
}

testPesepayPayment();
