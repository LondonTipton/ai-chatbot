import { type NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { pesepayService } from "@/lib/payment/pesepay-service";

const logger = createLogger("test-initiate/route");

/**
 * Test endpoint for Pesepay payment initiation (v1 API)
 * GET /api/payment/test-initiate
 */
export async function GET(request: NextRequest) {
  try {
    logger.log("\n=== PESEPAY V1 API TEST ===\n");

    // Check credentials
    if (
      !process.env.PESEPAY_INTEGRATION_KEY ||
      !process.env.PESEPAY_ENCRYPTION_KEY
    ) {
      return NextResponse.json(
        {
          error: "Pesepay credentials not configured",
          details:
            "Please set PESEPAY_INTEGRATION_KEY and PESEPAY_ENCRYPTION_KEY",
        },
        { status: 500 }
      );
    }

    logger.log("✓ Credentials configured");

    // Step 1: Get active currencies
    logger.log("\n1. Fetching active currencies...");
    let currencies;
    try {
      currencies = await pesepayService.getActiveCurrencies();
      logger.log("✓ Currencies:", currencies);
    } catch (error) {
      logger.error("✗ Failed to fetch currencies:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch currencies",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 2: Get payment methods for USD
    logger.log("\n2. Fetching payment methods for USD...");
    let paymentMethods;
    try {
      paymentMethods = await pesepayService.getPaymentMethodsByCurrency("USD");
      logger.log("✓ Payment methods:", paymentMethods);
    } catch (error) {
      logger.error("✗ Failed to fetch payment methods:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch payment methods",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Find Ecocash method
    const ecocashMethod = paymentMethods.find((method: any) =>
      method.name.toLowerCase().includes("ecocash")
    );

    if (!ecocashMethod) {
      return NextResponse.json(
        {
          error: "Ecocash payment method not found",
          availableMethods: paymentMethods.map((m: any) => m.name),
        },
        { status: 400 }
      );
    }

    logger.log("✓ Found Ecocash method:", ecocashMethod);

    // Step 3: Initiate test transaction
    logger.log("\n3. Initiating test transaction...");
    const referenceNumber = `TEST-${Date.now()}`;
    const testData = {
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "263771234567", // Test phone number
      amount: 1.0, // $1 test payment
      currency: "USD",
      description: "Test Payment - DeepCounsel",
      referenceNumber,
      paymentMethodCode: ecocashMethod.code,
    };

    logger.log("Test data:", testData);

    let transactionResponse;
    try {
      transactionResponse =
        await pesepayService.initiateSeamlessTransaction(testData);
      logger.log("✓ Transaction initiated:", transactionResponse);
    } catch (error) {
      logger.error("✗ Failed to initiate transaction:", error);
      return NextResponse.json(
        {
          error: "Failed to initiate transaction",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 4: Check transaction status
    logger.log("\n4. Checking transaction status...");
    let statusResponse;
    try {
      statusResponse =
        await pesepayService.checkTransactionStatus(referenceNumber);
      logger.log("✓ Status check:", statusResponse);
    } catch (error) {
      logger.error("✗ Failed to check status:", error);
      // Don't fail the test if status check fails
      statusResponse = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }

    logger.log("\n=== TEST COMPLETE ===\n");

    return NextResponse.json({
      success: true,
      message: "Pesepay v1 API test completed successfully",
      results: {
        credentials: "✓ Configured",
        currencies,
        paymentMethods: paymentMethods.map((m: any) => ({
          name: m.name,
          code: m.code,
        })),
        selectedMethod: {
          name: ecocashMethod.name,
          code: ecocashMethod.code,
        },
        transaction: {
          referenceNumber,
          response: transactionResponse,
          redirectUrl:
            transactionResponse.redirectUrl || transactionResponse.pollUrl,
        },
        status: statusResponse,
      },
    });
  } catch (error) {
    logger.error("\n✗ TEST FAILED:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
