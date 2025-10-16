import { NextResponse } from "next/server";
import { PesepayDirectClient } from "@/lib/payment/pesepay-direct";

export async function GET() {
  try {
    const integrationKey = process.env.PESEPAY_INTEGRATION_KEY;
    const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY;

    if (!integrationKey || !encryptionKey) {
      return NextResponse.json(
        { error: "Pesepay credentials not configured" },
        { status: 500 }
      );
    }

    console.log("Testing Pesepay connection...");
    console.log(
      "Integration Key (first 10 chars):",
      integrationKey.substring(0, 10)
    );
    console.log(
      "Encryption Key (first 10 chars):",
      encryptionKey.substring(0, 10)
    );

    const client = new PesepayDirectClient(integrationKey, encryptionKey);

    // Test 1: Get active currencies
    console.log("Test 1: Fetching active currencies...");
    try {
      const currencies = await client.getActiveCurrencies();
      console.log("✅ Currencies fetched:", currencies);

      return NextResponse.json({
        success: true,
        test: "getActiveCurrencies",
        result: currencies,
      });
    } catch (error: any) {
      console.error("❌ Error fetching currencies:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Data:", error.response.data);
        console.error("URL:", error.config?.url);
      }

      return NextResponse.json({
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    }
  } catch (error: any) {
    console.error("Test error:", error);
    return NextResponse.json(
      {
        error: error.message || "Test failed",
      },
      { status: 500 }
    );
  }
}
