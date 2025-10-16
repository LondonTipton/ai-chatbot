-- Create Subscription table
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

-- Create Payment table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_subscription_userId" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "idx_subscription_status" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "idx_payment_userId" ON "Payment"("userId");
CREATE INDEX IF NOT EXISTS "idx_payment_referenceNumber" ON "Payment"("referenceNumber");
CREATE INDEX IF NOT EXISTS "idx_payment_status" ON "Payment"("status");
