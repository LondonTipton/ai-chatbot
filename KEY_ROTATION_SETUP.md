# Gemini API Key Rotation - Setup Complete

## What Was Implemented

### 1. Model Updates

- **Tsukiyo (chat-model)**: Now uses `gemini-2.5-flash`
- **Jacana (chat-model-reasoning)**: Now uses `gemini-2.5-pro`
- **Other models**: Updated to `gemini-2.5-flash`

### 2. Intelligent Key Balancer

The balancer (`lib/ai/gemini-key-balancer.ts`) now includes:

- **Round-robin rotation**: Automatically cycles through 6 API keys
- **Error tracking**: Monitors errors per key
- **Automatic key disabling**: When a key hits quota/rate limits, it's temporarily disabled
- **Cooldown period**: Disabled keys are re-enabled after the retry delay (from API error response)
- **Smart fallback**: If all keys are disabled, uses the least recently disabled one

### 3. Key Statistics Tracking

Each key tracks:

- Request count
- Error count
- Last used timestamp
- Disabled status
- Cooldown expiration time
- Last error message

## How It Works

### Automatic Key Rotation

1. Each request gets the next available key in rotation
2. Disabled keys are automatically skipped
3. Keys are re-enabled after their cooldown period expires

### Error Handling

When a quota error occurs:

1. The error is detected (status 429 or "quota"/"rate limit" in message)
2. The retry delay is extracted from the error (e.g., "retry in 56s")
3. The key is marked as disabled for that duration
4. Next request automatically uses a different key

### Current Configuration

You have **6 API keys** configured:

- `GOOGLE_GENERATIVE_AI_API_KEY` (primary)
- `GOOGLE_GENERATIVE_AI_API_KEY_1` through `_5`

## Benefits

### With gemini-2.5-flash

- **Higher quotas** than experimental models
- **Better stability** for production use
- **Faster responses** with the latest model

### With 6 Keys Rotating

- **Automatic failover** when one key hits limits
- **Extended capacity** across all keys
- **Zero downtime** - always an available key
- **Self-healing** - keys automatically re-enable after cooldown

## Monitoring

### Check Key Status

The balancer logs key rotation events:

```
[Gemini Balancer] Loaded 6 API key(s)
[Gemini Balancer] Disabled key AIzaSyC4... for 60s due to: Quota exceeded
[Gemini Balancer] Re-enabled key AIzaSyC4... after cooldown
```

### View Statistics

Access the admin endpoint (if implemented):

```
GET /api/admin/gemini-stats
```

Returns:

```json
{
  "keyCount": 6,
  "stats": [
    {
      "key": "AIzaSyC4...",
      "requestCount": 42,
      "errorCount": 1,
      "isDisabled": false,
      "lastUsed": 1704672000000
    }
  ]
}
```

## Next Steps

### Optional Enhancements

1. **Add admin endpoint** to view key statistics in real-time
2. **Implement alerts** when multiple keys are disabled
3. **Add metrics** to track key performance over time
4. **Configure per-model keys** for specialized use cases

### Testing

1. Restart your dev server
2. Make multiple requests
3. Watch the console for rotation logs
4. Verify different keys are being used

## Troubleshooting

### All keys hitting quota

- **Solution**: Add more API keys or upgrade to paid tier
- **Check**: View key stats to see which keys are disabled

### Keys not rotating

- **Check**: Console logs should show "Loaded 6 API key(s)"
- **Verify**: All 6 keys are set in `.env.local`
- **Restart**: Dev server after adding new keys

### Errors still occurring

- **Reason**: All keys may be disabled simultaneously
- **Solution**: Wait for cooldown period or add more keys
- **Check**: Error logs will show "All keys disabled" warning
