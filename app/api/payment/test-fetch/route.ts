import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { pesepayService } from "@/lib/payment/pesepay-service";

const logger = createLogger("test-fetch/route");

export async function GET() {
  try {
    logger.log("\n=== PESEPAY PAYMENT METHODS TEST ===\n");

    // Test: Get payment methods for USD
    logger.log("Fetching payment methods for USD...");
    const paymentMethods =
      await pesepayService.getPaymentMethodsByCurrency("USD");
    logger.log("✅ Payment methods fetched:", paymentMethods);

    return NextResponse.json({
      success: true,
      test: "getPaymentMethodsByCurrency",
      currency: "USD",
      result: paymentMethods,
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
