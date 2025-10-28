import { NextResponse } from "next/server";
import { pesepayService } from "@/lib/payment/pesepay-service";

export async function GET() {
  try {
    console.log("\n=== PESEPAY PAYMENT METHODS TEST ===\n");

    // Test: Get payment methods for USD
    console.log("Fetching payment methods for USD...");
    const paymentMethods =
      await pesepayService.getPaymentMethodsByCurrency("USD");
    console.log("✅ Payment methods fetched:", paymentMethods);

    return NextResponse.json({
      success: true,
      test: "getPaymentMethodsByCurrency",
      currency: "USD",
      result: paymentMethods,
    });
  } catch (error: any) {
    console.error("❌ Test error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Test failed",
      },
      { status: 500 }
    );
  }
}
