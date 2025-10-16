# 🚀 Quick Payment Reference

## Setup (3 Steps)

```bash
# 1. Add to .env.local
PESEPAY_INTEGRATION_KEY=your_key
PESEPAY_ENCRYPTION_KEY=your_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 2. Run migration
pnpm tsx scripts/setup-payments.ts

# 3. Start dev server
pnpm dev
```

## Test Flow

1. Visit: `http://localhost:3000/pricing`
2. Click: "Get Pro" (or any plan)
3. Fill form with test Ecocash number
4. Watch real-time status updates

## Key URLs

- **Pricing**: `/pricing`
- **Checkout**: `/checkout?plan=Pro`
- **Status**: `/payment/status?ref=DC-123456`

## API Endpoints

```typescript
POST / api / payment / initiate; // Start payment
GET / api / payment / status; // Check status
POST / api / payment / callback; // Webhook
```

## Database Tables

```sql
Subscription  // User plans & billing dates
Payment       // Transaction history
```

## Phone Format

```
Valid: 0771234567, 0781234567, 0711234567
Invalid: +263771234567, 771234567
```

## Payment Status Flow

```
pending → completed ✅
pending → failed ❌
```

## Files to Know

```
components/checkout-form.tsx           // Payment form
lib/payment/pesepay-service.ts         // API wrapper
app/api/payment/initiate/route.ts      // Start payment
app/(auth)/payment/status/page.tsx     // Status tracker
```

## Common Commands

```bash
# Setup database
pnpm tsx scripts/setup-payments.ts

# Check types
pnpm tsc --noEmit

# Run dev
pnpm dev

# View database
pnpm db:studio
```

## Environment Variables

```env
# Required
PESEPAY_INTEGRATION_KEY=xxx
PESEPAY_ENCRYPTION_KEY=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Already configured
POSTGRES_URL=xxx
AUTH_SECRET=xxx
```

## Pricing Plans

| Plan  | Price | Features                     |
| ----- | ----- | ---------------------------- |
| Basic | $10   | Limited AI, Basic models     |
| Pro   | $30   | Extended AI, Advanced models |
| Pro+  | $50   | 3x usage, Team features      |
| Ultra | $100  | 20x usage, API access        |

## Quick Debug

```typescript
// Check payment in DB
SELECT * FROM "Payment" WHERE "referenceNumber" = 'DC-123456';

// Check subscription
SELECT * FROM "Subscription" WHERE "userId" = 'user-id';

// View logs
console.log in browser console
```

## Support Links

- Pesepay Docs: https://developers.pesepay.com/
- Get Credentials: https://developers.pesepay.com/
- Integration Guide: See `PESEPAY_INTEGRATION.md`

## Status Codes

```typescript
// Payment Status
pending; // Waiting for user
completed; // Payment successful
failed; // Payment failed
cancelled; // User cancelled

// Subscription Status
active; // Currently active
pending; // Awaiting payment
expired; // Subscription ended
cancelled; // User cancelled
```

## Next Steps

1. ✅ Add credentials
2. ✅ Run migration
3. ✅ Test checkout
4. ⏳ Implement recurring billing cron
5. ⏳ Add email notifications
6. ⏳ Build admin dashboard

---

**That's it!** You're ready to accept payments. 🎉
