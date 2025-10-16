import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/queries";
import { payment, subscription } from "@/lib/db/schema";
import { pesepayService } from "@/lib/payment/pesepay-service";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const referenceNumber = searchParams.get("ref");

    if (!referenceNumber) {
      return NextResponse.json(
        { error: "Reference number required" },
        { status: 400 }
      );
    }

    // Get payment from database
    const paymentRecord = await db.query.payment.findFirst({
      where: (p: any, { and, eq }: any) =>
        and(
          eq(p.referenceNumber, referenceNumber),
          eq(p.userId, session.user.id)
        ),
    });

    if (!paymentRecord) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Check status with Pesepay
    const statusResponse = await pesepayService.checkTransactionStatus(
      referenceNumber
    );

    // Update payment status in database
    const newStatus =
      statusResponse.transactionStatus === "SUCCESS"
        ? "completed"
        : statusResponse.transactionStatus === "FAILED"
        ? "failed"
        : "pending";

    await db
      .update(payment)
      .set({
        status: newStatus,
        pesepayResponse: statusResponse,
        updatedAt: new Date(),
      })
      .where(eq(payment.id, paymentRecord.id));

    // If payment successful, activate subscription
    if (newStatus === "completed") {
      const userSubscription = await db.query.subscription.findFirst({
        where: (sub: any, { eq }: any) => eq(sub.userId, session.user.id),
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

    return NextResponse.json({
      status: newStatus,
      transactionStatus: statusResponse.transactionStatus,
      amount: statusResponse.amount,
      currency: statusResponse.currency,
      paymentMethod: statusResponse.paymentMethod,
      referenceNumber: statusResponse.referenceNumber,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check payment status",
      },
      { status: 500 }
    );
  }
}
