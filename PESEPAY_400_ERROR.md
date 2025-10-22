# Pesepay 400 Error Troubleshooting

## Current Status

✅ **Fixed**: Encryption key length error - resolved by adding `pesepay` to `serverExternalPackages` in `next.config.ts`

❌ **Current Issue**: Getting `400 Bad Request` from Pesepay API

## Error Details

```
[PesepayService] Seamless payment response: {
  success: false,
  message: 'Request failed with status code 400'
}
```

## Possible Causes

### 1. Credentials Not Activated

Your credentials appear to be from the Pesepay dashboard:

- Integration Key: `6263baa6-7a52-4a90-8ed0-fbc149a0b87f`
- Encryption Key: `e16c46c66cdc41288c7f859bcf33cf31`

**Action Required**: Contact Pesepay support to:

- Verify your account is activated
- Confirm these credentials are valid for the production API
- Check if you need sandbox/test credentials instead
- Verify your account has the necessary permissions

### 2. Missing Account Verification

Pesepay may require:

- Business verification documents
- Bank account verification
- KYC (Know Your Customer) completion

### 3. API Endpoint Issues

The package is using:

- Base URL: `https://api.pesepay.com/api/payments-engine`
- Seamless Payment: `/v2/payments/make-payment`

**Check**: Confirm with Pesepay if this is the correct endpoint for your account type.

### 4. Payment Method Restrictions

You're using:

- Currency: USD
- Payment Method: PZW211 (Ecocash USD)

**Check**: Verify your account is enabled for:

- USD transactions
- Ecocash USD payment method
- Seamless payment flow (vs redirect flow)

## Next Steps

### Immediate Actions

1. **Contact Pesepay Support**

   - Email: support@pesepay.com (or check their website)
   - Provide your Integration Key
   - Ask about the 400 error and account activation status
   - Request test credentials if available

2. **Check Pesepay Dashboard**

   - Log into your Pesepay merchant dashboard
   - Look for account status/verification requirements
   - Check if there are any pending actions
   - Verify payment methods are enabled

3. **Try Redirect Flow Instead**
   - The seamless flow might require additional setup
   - Try the redirect flow as an alternative:
   ```typescript
   await pesepayService.initiateRedirectTransaction(data);
   ```

### Testing Alternative

If you want to test the integration without waiting for Pesepay:

1. **Mock the Payment Service** (for development only)

   - Create a mock service that simulates successful payments
   - Test your UI and database flow
   - Replace with real service once credentials are activated

2. **Use Test Mode**
   - Ask Pesepay for sandbox/test credentials
   - Test the full flow in a safe environment

## Technical Details

### Request Format (Encrypted)

The Pesepay SDK encrypts the payload using AES-256-CBC before sending:

- Encryption working correctly ✅
- Request reaching Pesepay API ✅
- API rejecting the request ❌

### Credentials Format

Both credentials are correctly formatted:

- Integration Key: UUID format (36 chars)
- Encryption Key: 32 characters (required for AES-256)

## Contact Information

**Pesepay Support**:

- Website: https://www.pesepay.com
- Look for support/contact information
- Provide your merchant ID and integration key

## Temporary Workaround

While waiting for Pesepay support, you can:

1. Comment out the payment initiation in your checkout flow
2. Add a "Payment Pending Setup" message
3. Store the payment intent in your database
4. Process manually once credentials are activated

Would you like me to implement any of these workarounds?
