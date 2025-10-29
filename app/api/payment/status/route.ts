import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/appwrite/server-auth";
import { db } from "@/lib/db/queries";
import { payment, subscription } from "@/lib/db/schema";
import { pesepayService } from "@/lib/payment/pesepay-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get local user from database using Appwrite ID
    const localUser = await db.query.user.findFirst({
      where: (users: any, { eq }: any) => eq(users.appwriteId, session.user.id),
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

    // Extract Pesepay's reference number from the stored response
    const pesepayResponse = paymentRecord.pesepayResponse as any;
    const pesepayReferenceNumber = pesepayResponse?.referenceNumber;

    if (!pesepayReferenceNumber) {
      console.error("No Pesepay reference number found in payment record");
      return NextResponse.json(
        { error: "Invalid payment record" },
        { status: 500 }
      );
    }

    console.log(
      `[Payment Status] Checking Pesepay status with reference: ${pesepayReferenceNumber}`
    );

    // Check status with Pesepay using their reference number
    const statusResponse = await pesepayService.checkTransactionStatus(
      pesepayReferenceNumber
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
      // Use amount from our payment record if Pesepay doesn't return it
      amount: statusResponse.amount || paymentRecord.amount,
      currency: statusResponse.currency || paymentRecord.currency,
      paymentMethod:
        statusResponse.paymentMethod || paymentRecord.paymentMethod,
      referenceNumber: statusResponse.referenceNumber || referenceNumber,
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
