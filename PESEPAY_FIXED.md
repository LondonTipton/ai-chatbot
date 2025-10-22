# Pesepay Integration Fixed ✅

## Problem Identified

The payment integration was failing with a 400 error: **"Can not perform transaction of the specified amount in the specified currency."**

## Root Cause

The code was using **incorrect payment method codes**:

- ❌ Used: `"ecocash"` (generic name)
- ✅ Correct: `"PZW211"` (actual Pesepay code for Ecocash USD)

## What Was Fixed

### 1. Payment Method Discovery

- Now fetches actual payment methods from Pesepay API
- Uses correct payment method codes (e.g., `PZW211` for Ecocash USD)
- Validates minimum/maximum amounts

### 2. Currency Support

- **USD**: Fully supported with multiple payment methods

  - Ecocash USD (PZW211): $1 - $3,000
  - Visa (PZW204): $0.10 - $3,000
  - MasterCard (PZW205): $0.10 - $100,000
  - Innbucks USD (PZW212): $1 - $1,000
  - Zimswitch USD (PZW215): $0.10 - $3,000

- **ZiG** (Zimbabwe Gold): Supported but no payment methods configured yet

### 3. Service Improvements

- Fixed `checkTransactionStatus` to use correct `checkPayment` method
- Removed unnecessary `async` keywords
- Added real API calls for currencies and payment methods
- Better error logging and handling

### 4. Test Scripts Created

- `scripts/test-pesepay-direct.ts` - Direct API testing
- `scripts/check-pesepay-currencies.ts` - Check available currencies and payment methods

## Test Results

✅ **$30 USD payment with Ecocash (PZW211) - SUCCESS**

```json
{
  "referenceNumber": "20251022021820933-CE2FDED1",
  "transactionStatus": "PROCESSING",
  "amountDetails": {
    "amount": 30,
    "currencyCode": "USD",
    "customerPayableAmount": 30.6,
    "transactionServiceFee": 0.6
  },
  "pollUrl": "https://api.pesepay.com/api/payments-engine/v1/payments/check-payment?referenceNumber=20251022021820933-CE2FDED1"
}
```

## How to Use

### 1. Test the Integration

```bash
# Check available currencies and payment methods
pnpm tsx scripts/check-pesepay-currencies.ts

# Test a payment
pnpm tsx scripts/test-pesepay-direct.ts
```

### 2. Use in Your App

The checkout flow now automatically:

1. Fetches available payment methods for the selected currency
2. Uses the correct payment method code (PZW211 for Ecocash USD)
3. Validates amounts against min/max limits
4. Initiates payment with proper required fields

### 3. Payment Flow

1. User selects plan on `/checkout?plan=Basic`
2. System fetches payment methods for USD
3. Finds Ecocash USD (PZW211) with $1-$3,000 range
4. Initiates payment with correct code
5. User receives prompt on their phone (0789787583)
6. Payment status can be checked via poll URL

## Important Notes

### Minimum Amounts

- Ecocash USD: **$1 minimum**
- Visa/MasterCard: **$0.10 minimum**

### Required Fields

- Ecocash requires: `customerPhoneNumber`
- Cards require: `creditCardNumber`, `creditCardExpiryDate`, `creditCardSecurityNumber`

### Transaction Fees

- Pesepay charges a service fee (e.g., $0.60 on $30 = 2%)
- Customer pays: `amount + serviceFee`

## Next Steps

1. ✅ Payment initiation working
2. ⏳ Test payment completion flow
3. ⏳ Test callback handling
4. ⏳ Test status checking
5. ⏳ Add support for other payment methods (Visa, MasterCard, etc.)

## Files Modified

- `lib/payment/pesepay-service.ts` - Fixed methods and added real API calls
- `app/api/payment/initiate/route.ts` - Uses correct payment method codes
- Created test scripts for validation

The integration is now ready for testing with real payments!
