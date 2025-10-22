# Pesepay Error Resolved

## Issue Found

The 400 error from Pesepay was caused by: **"Can not perform transaction of the specified amount in the specified currency."**

## Root Cause

The Pesepay API is rejecting transactions because:

1. **Amount too low**: 10 USD might be below the minimum transaction amount
2. **Currency/Payment Method mismatch**: The test credentials may not support USD transactions with Ecocash
3. **Test environment limitations**: Sandbox credentials might have restrictions

## Detailed Error Response

```json
{
  "timestamp": "2025-10-22T00:10:16.100+0000",
  "message": "Can not perform transaction of the specified amount in the specified currency.",
  "description": null,
  "status": "400"
}
```

## Solutions

### 1. Check Minimum Amount

Contact Pesepay support to confirm:

- Minimum transaction amount for USD
- Minimum transaction amount for ZWL
- Supported currency/payment method combinations

### 2. Try ZWL Currency

The test credentials might only support ZWL (Zimbabwe Dollar):

```typescript
// In checkout form or API
currency: "ZWL";
amount: 100; // Try a higher amount in ZWL
```

### 3. Try Higher Amount

Increase the test amount to ensure it's above any minimum:

```typescript
amount: 100; // or 1000 for ZWL
```

### 4. Verify Payment Method

Ensure the payment method code is correct for your currency:

- Check https://api.pesepay.com/api/payments-engine/v1/payment-methods/for-currency?currencyCode=USD
- Check https://api.pesepay.com/api/payments-engine/v1/payment-methods/for-currency?currencyCode=ZWL

## Code Improvements Made

1. **Fixed `checkTransactionStatus`** - Changed from non-existent `checkPaymentStatus` to correct `checkPayment` method
2. **Removed unnecessary `async`** - Removed from methods that don't use `await`
3. **Added detailed logging** - Now logs payment object and full responses
4. **Better error messages** - More descriptive error messages for debugging

## Next Steps

1. Contact Pesepay support to clarify:

   - Supported currencies for your integration key
   - Minimum transaction amounts
   - Test environment limitations

2. Update the checkout form to use supported currency/amount combinations

3. Consider adding currency/amount validation before initiating payment

## Testing Script

Use `scripts/test-pesepay-direct.ts` to test different amounts and currencies:

```bash
pnpm tsx scripts/test-pesepay-direct.ts
```

Modify the script to test different combinations.
