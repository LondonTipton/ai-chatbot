# Pesepay Integration Support Request

## Issue Summary

We are unable to authenticate with the Pesepay API despite having valid production credentials and an activated application.

## Environment

- **Application**: DeepCounsel (Legal AI Assistant)
- **Integration Type**: Seamless Payment (Server-to-Server)
- **Environment**: Production
- **API Base URL**: https://api.pesepay.com/api/payments-engine/v1

## Credentials Status

- ✅ Integration Key: Configured (e16c46c66cdc41288c7f859bcf33cf31)
- ✅ Encryption Key: Configured
- ✅ Application Status: Activated in dashboard
- ✅ Keys Type: Production keys

## Error Details

### Error 1: Integration Key Not Found (with pesepay-js package)

```
Response Status: 404
Response Data: {
  timestamp: '2025-10-16T03:25:13.624+0000',
  message: 'Integration key record was not found',
  description: null,
  status: '404'
}
Request URL: v2/payments/make-payment
```

### Error 2: 401 Unauthorized (with direct API calls)

```
Response Status: 401
Error: Parse Error: Missing expected CR after header value
```

## API Calls Attempted

### 1. Get Payment Methods

```
GET https://api.pesepay.com/api/payments-engine/v1/payment-methods/get-by-currency/USD
Headers:
  Content-Type: application/json
  Integration-Key: e16c46c66cdc41288c7f859bcf33cf31
```

### 2. Make Seamless Payment

```
POST https://api.pesepay.com/api/payments-engine/v1/payments/make-payment
Headers:
  Content-Type: application/json
  Integration-Key: e16c46c66cdc41288c7f859bcf33cf31
Body: {
  payload: <AES encrypted data>
}
```

## Authentication Methods Tried

1. ❌ Authorization header with integration key directly
2. ❌ Authorization: Bearer {integration_key}
3. ❌ Integration-Key custom header
4. ❌ Using pesepay-js npm package (v1.0.13)

## Questions for Pesepay Support

1. **Authentication Format**: What is the correct format for the Integration Key in API requests?

   - Should it be in Authorization header?
   - Should it be in a custom header? If so, what header name?
   - Does it need a Bearer prefix?

2. **API Version**: Which API version should we use?

   - v1 or v2?
   - The pesepay-js package uses v2 but returns 404

3. **Application Setup**: Are there additional steps needed in the dashboard?

   - Domain whitelisting?
   - IP whitelisting?
   - API access enablement?
   - Webhook configuration?

4. **Integration Key Status**: Can you verify our integration key is active?

   - Integration Key: e16c46c66cdc41288c7f859bcf33cf31
   - Is it properly linked to our application?
   - Does it have the correct permissions?

5. **API Documentation**: Is there updated API documentation?

   - The pesepay-js package seems outdated
   - Current documentation at developers.pesepay.com is limited

6. **Test Environment**: Do you have a sandbox/test environment?
   - If yes, what are the test API endpoints?
   - Can we get test credentials to verify our integration?

## What We Need

1. **Correct authentication format** for API requests
2. **Working example** of a successful API call (curl or code)
3. **Updated API documentation** with authentication details
4. **Verification** that our integration key is properly configured

## Technical Details

### Request Example (curl)

```bash
curl -X GET \
  'https://api.pesepay.com/api/payments-engine/v1/payment-methods/get-by-currency/USD' \
  -H 'Content-Type: application/json' \
  -H 'Integration-Key: e16c46c66cdc41288c7f859bcf33cf31'
```

### Expected Response

We expect to receive a list of payment methods for USD currency, including Ecocash.

### Actual Response

401 Unauthorized with malformed headers

## Contact Information

- **Developer**: [Your Name]
- **Email**: [Your Email]
- **Application**: DeepCounsel
- **Dashboard Account**: [Your Pesepay Account Email]

## Urgency

High - We have a production application ready to go live but blocked by authentication issues.

---

**Please provide:**

1. Correct authentication method
2. Working API example
3. Verification of our integration key status
4. Any additional setup steps required
