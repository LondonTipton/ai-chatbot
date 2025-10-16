import { NextResponse } from "next/server";
import { db } from "@/lib/db/queries";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks = {
    pesepayCredentials: false,
    appUrl: false,
    databaseConnection: false,
    paymentTableExists: false,
    subscriptionTableExists: false,
  };

  const errors: string[] = [];

  // Check Pesepay credentials
  if (
    process.env.PESEPAY_INTEGRATION_KEY &&
    process.env.PESEPAY_ENCRYPTION_KEY
  ) {
    checks.pesepayCredentials = true;
  } else {
    errors.push(
      "Missing PESEPAY_INTEGRATION_KEY or PESEPAY_ENCRYPTION_KEY in environment variables"
    );
  }

  // Check app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    checks.appUrl = true;
  } else {
    errors.push("Missing NEXT_PUBLIC_APP_URL in environment variables");
  }

  // Check database connection and tables
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    checks.databaseConnection = true;

    // Check if Payment table exists
    try {
      await db.execute(sql`SELECT 1 FROM "Payment" LIMIT 1`);
      checks.paymentTableExists = true;
    } catch (error) {
      errors.push(
        "Payment table does not exist. Run: pnpm tsx scripts/setup-payments.ts"
      );
    }

    // Check if Subscription table exists
    try {
      await db.execute(sql`SELECT 1 FROM "Subscription" LIMIT 1`);
      checks.subscriptionTableExists = true;
    } catch (error) {
      errors.push(
        "Subscription table does not exist. Run: pnpm tsx scripts/setup-payments.ts"
      );
    }
  } catch (error) {
    errors.push(`Database connection failed: ${error}`);
  }

  const allChecksPass = Object.values(checks).every((check) => check === true);

  return NextResponse.json({
    status: allChecksPass ? "ready" : "not_ready",
    checks,
    errors,
    message: allChecksPass
      ? "Payment system is ready!"
      : "Payment system needs configuration. See errors below.",
    nextSteps: allChecksPass
      ? ["You can now test the checkout flow at /pricing"]
      : [
          "1. Add Pesepay credentials to .env.local",
          "2. Add NEXT_PUBLIC_APP_URL to .env.local",
          "3. Run: pnpm tsx scripts/setup-payments.ts",
          "4. Restart your dev server",
        ],
  });
}
