# Payment System Troubleshooting

## Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This error means the API is returning an HTML error page instead of JSON. Here's how to fix it:

### Step 1: Check Setup Status

Visit: http://localhost:3000/payment/setup

This page will show you exactly what's missing.

### Step 2: Add Environment Variables

Create or update `.env.local` with:

```env
# Pesepay Credentials (get from https://developers.pesepay.com/)
PESEPAY_INTEGRATION_KEY=your_integration_key_here
PESEPAY_ENCRYPTION_KEY=your_encryption_key_here

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Create Database Tables

Run the setup script:

```bash
pnpm tsx scripts/setup-payments.ts
```

This will create the `Payment` and `Subscription` tables.

### Step 4: Restart Dev Server

```bash
# Stop the server (Ctrl+C)
# Then restart
pnpm dev
```

### Step 5: Test Again

1. Visit http://localhost:3000/payment/setup to verify everything is green
2. Go to http://localhost:3000/pricing
3. Select a plan and try checkout again

## Common Issues

### "Pesepay credentials not configured"

**Problem**: Missing environment variables

**Solution**:

- Add `PESEPAY_INTEGRATION_KEY` and `PESEPAY_ENCRYPTION_KEY` to `.env.local`
- Get credentials from https://developers.pesepay.com/
- Restart dev server

### "Database error. Please run the payment setup script"

**Problem**: Payment tables don't exist in database

**Solution**:

```bash
pnpm tsx scripts/setup-payments.ts
```

### "Failed to fetch payment methods"

**Problem**: Invalid Pesepay credentials or API is down

**Solution**:

- Verify your credentials are correct
- Check if you're using test/sandbox credentials in development
- Check Pesepay API status

### "Unauthorized"

**Problem**: User not logged in

**Solution**:

- Make sure you're logged in
- Visit /login or /register first

## Testing the Setup

### Quick Test Endpoint

Visit: http://localhost:3000/api/payment/test

This returns JSON showing:

- ✅ What's configured correctly
- ❌ What needs to be fixed
- 📋 Next steps to take

### Setup Page

Visit: http://localhost:3000/payment/setup

Visual interface showing:

- Configuration status
- Detailed error messages
- Setup instructions
- Quick actions

## Getting Pesepay Credentials

### For Testing (Sandbox)

1. Visit https://developers.pesepay.com/
2. Sign up for a developer account
3. Get your test credentials
4. Use these in development

### For Production

1. Create a business account at https://www.pesepay.com/
2. Complete verification
3. Get production credentials
4. Add to production environment variables

## Verification Checklist

Before testing checkout:

- [ ] `.env.local` has `PESEPAY_INTEGRATION_KEY`
- [ ] `.env.local` has `PESEPAY_ENCRYPTION_KEY`
- [ ] `.env.local` has `NEXT_PUBLIC_APP_URL`
- [ ] Database tables created (run setup script)
- [ ] Dev server restarted
- [ ] Visit `/payment/setup` shows all green checks
- [ ] User is logged in

## Still Having Issues?

1. Check browser console for detailed errors
2. Check terminal/server logs
3. Visit `/payment/setup` for diagnostic info
4. Verify database connection with `pnpm db:studio`
5. Test Pesepay credentials with their API directly

## Quick Commands

```bash
# Check setup status
curl http://localhost:3000/api/payment/test

# Create database tables
pnpm tsx scripts/setup-payments.ts

# View database
pnpm db:studio

# Restart dev server
pnpm dev
```

## Need Help?

- Check `PESEPAY_INTEGRATION.md` for detailed integration guide
- Check `CHECKOUT_SETUP.md` for setup instructions
- Visit https://developers.pesepay.com/ for Pesepay documentation
