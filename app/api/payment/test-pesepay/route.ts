import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { pesepayService } from "@/lib/payment/pesepay-service";

const logger = createLogger("test-pesepay/route");

export async function GET() {
  try {
    logger.log("\n=== PESEPAY PACKAGE TEST ===\n");

    // Test: Get active currencies
    logger.log("Fetching active currencies...");
    const currencies = await pesepayService.getActiveCurrencies();
    logger.log("✅ Currencies fetched:", currencies);

    return NextResponse.json({
      success: true,
      test: "getActiveCurrencies",
      result: currencies,
    });
  } catch (error: any) {
    logger.error("❌ Test error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Test failed",
      },
      { status: 500 }
    );
  }
}
