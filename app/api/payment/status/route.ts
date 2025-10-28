import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/appwrite/auth";
import { db } from "@/lib/db/queries";
import { payment, subscription } from "@/lib/db/schema";
import { pesepayService } from "@/lib/payment/pesepay-service";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get local user from database using Appwrite ID
    const localUser = await db.query.user.findFirst({
      where: (users: any, { eq }: any) => eq(users.appwriteId, user.$id),
    });

    if (!localUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        and(eq(p.referenceNumber, referenceNumber), eq(p.userId, localUser.id)),
    });

    if (!paymentRecord) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Check status with Pesepay
    const statusResponse =
      await pesepayService.checkTransactionStatus(referenceNumber);

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
        where: (sub: any, { eq }: any) => eq(sub.userId, localUser.id),
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
