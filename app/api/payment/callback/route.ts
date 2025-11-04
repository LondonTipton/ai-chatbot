import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { payment, subscription } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";

const logger = createLogger("callback/route");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referenceNumber, transactionStatus } = body;

    if (!referenceNumber) {
      return NextResponse.json(
        { error: "Reference number required" },
        { status: 400 }
      );
    }

    // Find payment record
    const paymentRecord = await db.query.payment.findFirst({
      where: (p, { eq }) => eq(p.referenceNumber, referenceNumber),
    });

    if (!paymentRecord) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    const newStatus =
      transactionStatus === "SUCCESS"
        ? "completed"
        : transactionStatus === "FAILED"
          ? "failed"
          : "pending";

    await db
      .update(payment)
      .set({
        status: newStatus,
        pesepayResponse: body,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentRecord.id));

    // If payment successful, activate subscription
    if (newStatus === "completed") {
      const userSubscription = await db.query.subscription.findFirst({
        where: (sub, { eq }) => eq(sub.userId, paymentRecord.userId),
      });

      if (userSubscription) {
        const startDate = new Date();
        const nextBillingDate = new Date(startDate);
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        await db
          .update(subscription)
          .set({
            status: "active",
            startDate,
            nextBillingDate,
            updatedAt: new Date(),
          })
          .where(eq(subscription.id, userSubscription.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (Pesepay may send GET for IPN)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const referenceNumber = searchParams.get("referenceNumber");
    const transactionStatus = searchParams.get("transactionStatus");

    if (!referenceNumber) {
      return NextResponse.json(
        { error: "Reference number required" },
        { status: 400 }
      );
    }

    // Find payment record
    const paymentRecord = await db.query.payment.findFirst({
      where: (p, { eq }) => eq(p.referenceNumber, referenceNumber),
    });

    if (!paymentRecord) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    const newStatus =
      transactionStatus === "SUCCESS"
        ? "completed"
        : transactionStatus === "FAILED"
          ? "failed"
          : "pending";

    await db
      .update(payment)
      .set({
        status: newStatus,
        pesepayResponse: Object.fromEntries(searchParams.entries()),
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentRecord.id));

    // If payment successful, activate subscription
    if (newStatus === "completed") {
      const userSubscription = await db.query.subscription.findFirst({
        where: (sub, { eq }) => eq(sub.userId, paymentRecord.userId),
      });

      if (userSubscription) {
        const startDate = new Date();
        const nextBillingDate = new Date(startDate);
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        await db
          .update(subscription)
          .set({
            status: "active",
            startDate,
            nextBillingDate,
            updatedAt: new Date(),
          })
          .where(eq(subscription.id, userSubscription.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 }
    );
  }
}
