# 🚀 Quick Setup Instructions

## ✅ Database Setup Complete!

The payment tables have been created in your database. Now you just need to add your Pesepay keys.

## Step 1: Get Your Pesepay Keys

1. Visit: **https://dashboard.pesepay.com/**
2. Login to your account (or register if you don't have one)
3. Navigate to the **Applications** menu
4. Copy your **Integration Key** and **Encryption Key**

## Step 2: Add Keys to .env.local

Open the `.env.local` file in your project root and add these lines:

```env
# Pesepay Payment Gateway
PESEPAY_INTEGRATION_KEY=paste_your_integration_key_here
PESEPAY_ENCRYPTION_KEY=paste_your_encryption_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Example:**

```env
PESEPAY_INTEGRATION_KEY=abc123def456ghi789
PESEPAY_ENCRYPTION_KEY=xyz987uvw654rst321
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Restart Your Dev Server

```bash
# Stop the server (press Ctrl+C in the terminal)
# Then restart it:
pnpm dev
```

## Step 4: Verify Setup

Visit: **http://localhost:3000/payment/setup**

You should see all green checkmarks ✅

## Step 5: Test the Payment Flow

1. Visit: **http://localhost:3000/pricing**
2. Click on any plan (e.g., "Get Pro")
3. Fill in the checkout form
4. Test with a Pesepay test phone number

## 🎉 That's It!

Your payment system is now fully integrated and ready to use!

---

## Quick Links

- **Setup Status**: http://localhost:3000/payment/setup
- **Pricing Page**: http://localhost:3000/pricing
- **Pesepay Dashboard**: https://dashboard.pesepay.com/
- **Test API**: http://localhost:3000/api/payment/test

## Need Help?

- Check `TROUBLESHOOTING_PAYMENT.md` for common issues
- Check `PESEPAY_INTEGRATION.md` for detailed documentation
- Visit the setup page for diagnostic information

---

## What's Been Set Up

✅ Database tables created (Payment & Subscription)
✅ API routes configured
✅ Checkout pages built
✅ Payment status tracking
✅ Webhook handlers
✅ Error handling
✅ Setup diagnostic tools

**All you need to do is add your Pesepay keys!** 🔑
