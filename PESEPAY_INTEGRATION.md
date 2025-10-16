# Pesepay Payment Integration

This document describes the Pesepay payment gateway integration for DeepCounsel's subscription system.

## Overview

DeepCounsel uses Pesepay for seamless Ecocash payments in USD. The integration supports:

- **Seamless payments**: Users stay on our platform (no redirect to Pesepay)
- **Ecocash only**: USD payments via Ecocash mobile money
- **Recurring billing**: Automatic 30-day subscription cycles
- **Real-time status**: Live payment status updates

## Architecture

```
User → Checkout Page → API (Initiate) → Pesepay API
                                            ↓
User Phone ← Ecocash Prompt ← Pesepay
     ↓
User Enters PIN
     ↓
Status Page ← API (Poll Status) ← Pesepay API
     ↓
Subscription Activated
```

## Setup

### 1. Environment Variables

Add to your `.env.local`:

```env
PESEPAY_INTEGRATION_KEY=your_integration_key_here
PESEPAY_ENCRYPTION_KEY=your_encryption_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get your credentials from [Pesepay Developer Portal](https://developers.pesepay.com/)

### 2. Database Migration

Run the migration to create payment tables:

```bash
pnpm db:push
```

Or manually run the SQL in `lib/db/migrations/0001_add_payment_tables.sql`

### 3. Test Mode

The integration automatically uses Pesepay's test environment in development:

- `NODE_ENV !== 'production'` → Test mode enabled
- Use test credentials from Pesepay

## User Flow

### 1. Select Plan

User visits `/pricing` and selects a plan (Basic, Pro, Pro+, or Ultra)

### 2. Checkout

User is redirected to `/checkout?plan=Pro` with:

- Order summary
- Payment form (name, email, phone)
- Ecocash payment instructions

### 3. Payment Initiation

When user submits:

1. Form validates Ecocash number format (077/078/071 + 7 digits)
2. API creates payment record in database
3. API calls Pesepay to initiate seamless transaction
4. User receives Ecocash prompt on their phone

### 4. Payment Status

User is redirected to `/payment/status?ref=DC-123456789`

- Page polls payment status every 5 seconds
- Shows real-time status: Pending → Completed/Failed
- User enters PIN on phone to complete payment

### 5. Subscription Activation

When payment completes:

1. Payment status updated to "completed"
2. Subscription status updated to "active"
3. Next billing date set to +30 days
4. User can start using the service

## API Routes

### POST /api/payment/initiate

Initiates a new payment transaction

**Request:**

```json
{
  "plan": "Pro",
  "amount": 30,
  "currency": "USD",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "0771234567"
}
```

**Response:**

```json
{
  "success": true,
  "referenceNumber": "DC-1234567890-abc123",
  "pollUrl": "https://...",
  "message": "Payment initiated..."
}
```

### GET /api/payment/status?ref=DC-123456

Checks payment status

**Response:**

```json
{
  "status": "completed",
  "transactionStatus": "SUCCESS",
  "amount": 30,
  "currency": "USD",
  "paymentMethod": "ecocash",
  "referenceNumber": "DC-123456"
}
```

### POST/GET /api/payment/callback

Webhook endpoint for Pesepay IPN (Instant Payment Notification)

Pesepay calls this endpoint when payment status changes.

## Database Schema

### Subscription Table

```sql
- id: uuid (PK)
- userId: uuid (FK → User)
- plan: enum (Basic, Pro, Pro+, Ultra)
- status: enum (active, cancelled, expired, pending)
- amount: varchar(20)
- currency: varchar(3) - default 'USD'
- startDate: timestamp
- nextBillingDate: timestamp
- cancelledAt: timestamp (nullable)
- createdAt: timestamp
- updatedAt: timestamp
```

### Payment Table

```sql
- id: uuid (PK)
- userId: uuid (FK → User)
- subscriptionId: uuid (FK → Subscription, nullable)
- amount: varchar(20)
- currency: varchar(3) - default 'USD'
- status: enum (pending, completed, failed, cancelled)
- paymentMethod: varchar(50) - default 'ecocash'
- referenceNumber: varchar(100) - unique
- pollUrl: text
- phoneNumber: varchar(20)
- description: text
- pesepayResponse: json
- createdAt: timestamp
- updatedAt: timestamp
```

## Recurring Payments

### How It Works

1. Initial payment creates subscription with `nextBillingDate` = now + 30 days
2. A cron job (to be implemented) checks for subscriptions due for renewal
3. For each due subscription:
   - Create new payment record
   - Initiate Pesepay transaction
   - Send notification to user
   - Update subscription dates on success

### Implementation (TODO)

Create a cron job or scheduled task:

- Check subscriptions where `nextBillingDate <= now()` and `status = 'active'`
- Initiate payment for each
- Handle failures (retry logic, grace period)

## Testing

### Test Phone Numbers

Use Pesepay test environment phone numbers (check their docs)

### Test Flow

1. Visit `/pricing`
2. Select any plan
3. Fill checkout form with test phone number
4. Check console for Pesepay API responses
5. Verify database records created
6. Test status polling

## Security Considerations

1. **API Keys**: Never commit real keys to git
2. **Webhook Validation**: Verify Pesepay webhook signatures (implement if available)
3. **User Authorization**: All payment APIs check user session
4. **Idempotency**: Reference numbers prevent duplicate payments
5. **HTTPS**: Always use HTTPS in production

## Error Handling

### Common Errors

- Invalid phone number format
- Insufficient Ecocash balance
- User cancels payment
- Network timeout
- Pesepay API errors

### User Experience

- Clear error messages
- Retry options
- Support contact information
- Transaction reference for support queries

## Monitoring

### Key Metrics to Track

- Payment success rate
- Average payment time
- Failed payment reasons
- Subscription churn rate
- Revenue by plan

### Logging

All payment operations are logged:

- Payment initiation
- Status checks
- Webhook callbacks
- Errors and failures

## Next Steps

1. **Implement recurring billing cron job**
2. **Add subscription management UI** (cancel, upgrade, downgrade)
3. **Email notifications** (payment success, failure, renewal reminders)
4. **Admin dashboard** (view payments, subscriptions, analytics)
5. **Webhook signature verification**
6. **Payment retry logic** for failed recurring payments
7. **Grace period** for expired subscriptions

## Support

For Pesepay API issues:

- Documentation: https://developers.pesepay.com/
- Support: Check Pesepay developer portal

For integration issues:

- Check logs in console
- Verify environment variables
- Test with Pesepay sandbox
