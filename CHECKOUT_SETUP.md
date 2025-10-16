# Checkout & Payment Setup Guide

## Quick Start

Your Pesepay payment integration is ready! Here's how to get started:

### 1. Add Environment Variables

Add these to your `.env.local` file:

```env
# Pesepay Credentials (get from https://developers.pesepay.com/)
PESEPAY_INTEGRATION_KEY=your_integration_key_here
PESEPAY_ENCRYPTION_KEY=your_encryption_key_here

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Run Database Migration

```bash
# Option 1: Using the setup script
pnpm tsx scripts/setup-payments.ts

# Option 2: Using Drizzle push
pnpm db:push
```

### 3. Test the Flow

1. Start your dev server: `pnpm dev`
2. Visit http://localhost:3000/pricing
3. Click "Get Pro" (or any plan)
4. Fill in the checkout form with test Ecocash number
5. Watch the payment status update in real-time

## Features Implemented

✅ **Seamless Checkout** - Users never leave your site
✅ **Ecocash USD Payments** - Zimbabwe mobile money integration  
✅ **Real-time Status** - Live payment status updates
✅ **Recurring Billing** - 30-day subscription cycles
✅ **Database Tracking** - Full payment and subscription history
✅ **Webhook Support** - IPN callbacks from Pesepay

## File Structure

```
app/
├── (auth)/
│   ├── checkout/page.tsx          # Checkout page
│   ├── payment/status/page.tsx    # Payment status tracker
│   └── pricing/page.tsx           # Updated with checkout links
└── api/payment/
    ├── initiate/route.ts          # Start payment
    ├── status/route.ts            # Check payment status
    └── callback/route.ts          # Pesepay webhook

components/
└── checkout-form.tsx              # Payment form component

lib/
├── db/
│   ├── schema.ts                  # Added Payment & Subscription tables
│   └── queries.ts                 # Exported db with schema
└── payment/
    └── pesepay-service.ts         # Pesepay API wrapper
```

## Testing

### Test Mode

The integration automatically uses Pesepay's test environment in development.

### Test Phone Numbers

Use Pesepay's test phone numbers (check their documentation).

### Test Flow

1. Select a plan from `/pricing`
2. Enter test phone number in checkout
3. Monitor console for API responses
4. Check database for created records

## Next Steps

### Immediate

- [ ] Add your Pesepay credentials
- [ ] Run database migration
- [ ] Test the checkout flow

### Future Enhancements

- [ ] Implement recurring billing cron job
- [ ] Add subscription management UI
- [ ] Email notifications for payments
- [ ] Admin dashboard for analytics
- [ ] Payment retry logic
- [ ] Grace period for expired subscriptions

## Troubleshooting

### "Pesepay credentials not configured"

- Make sure `PESEPAY_INTEGRATION_KEY` and `PESEPAY_ENCRYPTION_KEY` are in `.env.local`
- Restart your dev server after adding env variables

### "Invalid phone number"

- Ecocash numbers must match format: 077/078/071 + 7 digits
- Example: 0771234567

### Database errors

- Run `pnpm tsx scripts/setup-payments.ts` to create tables
- Check that `POSTGRES_URL` is configured

### Payment stuck on "pending"

- Check Pesepay API status
- Verify your credentials are correct
- Check console for error messages

## Support

- **Pesepay Docs**: https://developers.pesepay.com/
- **Integration Guide**: See `PESEPAY_INTEGRATION.md`
- **Database Schema**: See `lib/db/schema.ts`

## Security Notes

- Never commit `.env.local` to git
- Use HTTPS in production
- Validate webhook signatures (implement if available)
- Log all payment operations for audit trail
