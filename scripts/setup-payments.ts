/**
 * Setup script for Pesepay payment integration
 * Run with: pnpm tsx scripts/setup-payments.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// Create database connection
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function setupPaymentTables() {
  console.log("🚀 Setting up payment tables...");

  try {
    // Create Subscription table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL REFERENCES "User"("id"),
        "plan" varchar NOT NULL CHECK ("plan" IN ('Basic', 'Pro', 'Pro+', 'Ultra')),
        "status" varchar NOT NULL DEFAULT 'pending' CHECK ("status" IN ('active', 'cancelled', 'expired', 'pending')),
        "amount" varchar(20) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "startDate" timestamp NOT NULL,
        "nextBillingDate" timestamp NOT NULL,
        "cancelledAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("✅ Subscription table created");

    // Create Payment table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "userId" uuid NOT NULL REFERENCES "User"("id"),
        "subscriptionId" uuid REFERENCES "Subscription"("id"),
        "amount" varchar(20) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "status" varchar NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'completed', 'failed', 'cancelled')),
        "paymentMethod" varchar(50) NOT NULL DEFAULT 'ecocash',
        "referenceNumber" varchar(100) UNIQUE,
        "pollUrl" text,
        "phoneNumber" varchar(20),
        "description" text,
        "pesepayResponse" json,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      );
    `);
    console.log("✅ Payment table created");

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_subscription_userId" ON "Subscription"("userId");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_subscription_status" ON "Subscription"("status");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_payment_userId" ON "Payment"("userId");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_payment_referenceNumber" ON "Payment"("referenceNumber");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_payment_status" ON "Payment"("status");
    `);
    console.log("✅ Indexes created");

    console.log("\n🎉 Payment tables setup complete!");
    console.log("\nNext steps:");
    console.log("1. Add Pesepay credentials to .env.local");
    console.log("2. Test the checkout flow at /pricing");
    console.log("3. Monitor payments in the database");
  } catch (error) {
    console.error("❌ Error setting up payment tables:", error);
    throw error;
  }
}

setupPaymentTables()
  .then(() => {
    client.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    client.end();
    process.exit(1);
  });
