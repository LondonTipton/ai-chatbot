import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/appwrite/server-auth";
import { db } from "@/lib/db/queries";
import { payment, subscription } from "@/lib/db/schema";
import { pesepayService } from "@/lib/payment/pesepay-service";

export async function POST(request: NextRequest) {
  try {
    // Check if Pesepay credentials are configured
    if (
      !process.env.PESEPAY_INTEGRATION_KEY ||
      !process.env.PESEPAY_ENCRYPTION_KEY
    ) {
      console.error("Pesepay credentials not configured");
      return NextResponse.json(
        {
          error:
            "Payment system not configured. Please add Pesepay credentials to environment variables.",
        },
        { status: 500 }
      );
    }

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists in database using Appwrite ID
    const existingUser = await db.query.user.findFirst({
      where: (users: any, { eq }: any) => eq(users.appwriteId, session.user.id),
    });

    if (!existingUser) {
      console.error("User not found in database:", session.user.id);
      return NextResponse.json(
        {
          error: "User session invalid. Please refresh the page and try again.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      plan,
      amount,
      currency,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    if (!plan || !amount || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique reference number
    const referenceNumber = `DC-${Date.now()}-${existingUser.id.slice(0, 8)}`;

    // Get Ecocash payment method code for the specified currency
    let paymentMethods;
    try {
      paymentMethods = await pesepayService.getPaymentMethodsByCurrency(
        currency || "USD"
      );
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return NextResponse.json(
        {
          error:
            "Failed to fetch payment methods. Please check Pesepay credentials.",
        },
        { status: 500 }
      );
    }

    const ecocashMethod = paymentMethods.find((method: any) =>
      method.name.toLowerCase().includes("ecocash")
    );

    if (!ecocashMethod) {
      return NextResponse.json(
        {
          error: `Ecocash payment method not available for ${
            currency || "USD"
          }`,
        },
        { status: 400 }
      );
    }

    console.log("[Payment] Using payment method:", {
      code: ecocashMethod.code,
      name: ecocashMethod.name,
      minAmount: ecocashMethod.minimumAmount,
      maxAmount: ecocashMethod.maximumAmount,
    });

    // Create payment record
    let newPayment;
    try {
      [newPayment] = await db
        .insert(payment)
        .values({
          userId: existingUser.id,
          amount: amount.toString(),
          currency: currency || "USD",
          status: "pending",
          paymentMethod: "ecocash",
          referenceNumber,
          phoneNumber: customerPhone,
          description: `${plan} Plan Subscription`,
        })
        .returning();
    } catch (error) {
      console.error("Database error creating payment:", error);
      return NextResponse.json(
        {
          error:
            "Database error. Please run the payment setup script: pnpm tsx scripts/setup-payments.ts",
        },
        { status: 500 }
      );
    }

    // Initiate transaction with Pesepay (v1 API)
    console.log("Initiating Pesepay transaction with:", {
      referenceNumber,
      amount,
      currency: currency || "USD",
      paymentMethodCode: ecocashMethod.code,
      customerPhone,
    });

    let transactionResponse;
    try {
      transactionResponse = await pesepayService.initiateSeamlessTransaction({
        customerName,
        customerEmail,
        customerPhone,
        amount,
        currency: currency || "USD",
        description: `DeepCounsel ${plan} Plan`,
        referenceNumber,
        paymentMethodCode: ecocashMethod.code,
      });
      console.log("Pesepay response:", transactionResponse);
    } catch (error) {
      console.error("Pesepay API error:", error);
      return NextResponse.json(
        {
          error: `Pesepay API error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }

    // v1 API returns redirectUrl instead of pollUrl
    const redirectUrl =
      transactionResponse.redirectUrl || transactionResponse.pollUrl;

    // Update payment with Pesepay response (includes their reference number)
    await db
      .update(payment)
      .set({
        pollUrl: redirectUrl,
        pesepayResponse: transactionResponse,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, newPayment.id));

    // Check if user already has an active subscription
    const existingSubscription = await db.query.subscription.findFirst({
      where: (sub: any, { and, eq }: any) =>
        and(eq(sub.userId, existingUser.id), eq(sub.status, "active")),
    });

    // Create or update subscription (pending until payment confirmed)
    if (existingSubscription) {
      await db
        .update(subscription)
        .set({
          plan,
          amount: amount.toString(),
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, existingSubscription.id));
    } else {
      const startDate = new Date();
      const nextBillingDate = new Date(startDate);
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);

      await db.insert(subscription).values({
        userId: existingUser.id,
        plan,
        amount: amount.toString(),
        currency: currency || "USD",
        status: "pending",
        startDate,
        nextBillingDate,
      });
    }

    return NextResponse.json({
      success: true,
      referenceNumber,
      redirectUrl,
      pollUrl: redirectUrl, // Keep for backward compatibility
      message:
        "Payment initiated. Please complete payment via the redirect URL.",
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to initiate payment",
      },
      { status: 500 }
    );
  }
}
