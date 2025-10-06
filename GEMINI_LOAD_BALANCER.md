# Gemini API Key Load Balancer

DeepCounsel includes a built-in load balancer for Gemini API keys that automatically rotates through multiple API keys to distribute load and help avoid rate limits.

## Features

- **Round-robin rotation**: Automatically cycles through available API keys
- **Support for up to 5 keys**: Use 1-5 API keys for load distribution
- **Usage tracking**: Monitors request count and last usage time for each key
- **Zero configuration**: Works automatically when multiple keys are provided
- **Fallback support**: Works with a single key if that's all you have

## Setup

### 1. Get Multiple API Keys

Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and generate multiple API keys. You can create up to 5 keys for maximum load distribution.

### 2. Configure Environment Variables

Add your API keys to your `.env.local` file:

```bash
# Primary key (required)
GOOGLE_GENERATIVE_AI_API_KEY=your_primary_key_here

# Additional keys (optional, up to 5 total)
GOOGLE_GENERATIVE_AI_API_KEY_1=your_second_key_here
GOOGLE_GENERATIVE_AI_API_KEY_2=your_third_key_here
GOOGLE_GENERATIVE_AI_API_KEY_3=your_fourth_key_here
GOOGLE_GENERATIVE_AI_API_KEY_4=your_fifth_key_here
GOOGLE_GENERATIVE_AI_API_KEY_5=your_sixth_key_here
```

**Note**: You can use any combination of keys. The system will automatically detect and use all available keys.

### 3. Restart Your Application

After adding the keys, restart your development server:

```bash
pnpm dev
```

The load balancer will automatically initialize and log the number of keys detected:

```
[Gemini Balancer] Loaded 3 API key(s)
```

## How It Works

### Round-Robin Strategy

The load balancer uses a simple round-robin strategy:

1. Request 1 → Key 1
2. Request 2 → Key 2
3. Request 3 → Key 3
4. Request 4 → Key 1 (cycles back)
5. And so on...

This ensures even distribution of requests across all available keys.

### Automatic Integration

The load balancer is automatically integrated into the AI provider system. No code changes are needed - it works transparently in the background.

## Monitoring Usage

### View Statistics

You can monitor key usage statistics by accessing the admin endpoint:

```bash
GET http://localhost:3000/api/admin/gemini-stats
```

Response example:

```json
{
  "success": true,
  "keyCount": 3,
  "stats": [
    {
      "key": "AIzaSyBm...",
      "lastUsed": 1704672000000,
      "requestCount": 42
    },
    {
      "key": "AIzaSyC3...",
      "lastUsed": 1704672001000,
      "requestCount": 41
    },
    {
      "key": "AIzaSyDk...",
      "lastUsed": 1704672002000,
      "requestCount": 40
    }
  ],
  "timestamp": "2024-01-08T00:00:00.000Z"
}
```

**Note**: API keys are masked in the response for security (only first 8 characters shown).

## Benefits

### Rate Limit Management

Google's Gemini API has rate limits per API key. By using multiple keys, you can:

- Handle more concurrent requests
- Reduce the chance of hitting rate limits
- Improve application reliability during high traffic

### Cost Distribution

If you're using multiple billing accounts or want to distribute costs, you can use API keys from different Google Cloud projects.

### High Availability

If one key experiences issues or reaches its quota, the other keys continue to work, providing better fault tolerance.

## Best Practices

1. **Start with 2-3 keys**: This provides good load distribution without complexity
2. **Monitor usage**: Check the stats endpoint periodically to ensure even distribution
3. **Rotate keys regularly**: For security, consider rotating your API keys periodically
4. **Keep keys secure**: Never commit `.env.local` to version control
5. **Use separate projects**: Consider using keys from different Google Cloud projects for better isolation

## Troubleshooting

### No keys detected

**Error**: `No Gemini API keys found`

**Solution**: Ensure at least `GOOGLE_GENERATIVE_AI_API_KEY` is set in your `.env.local` file.

### Keys not rotating

**Issue**: All requests seem to use the same key

**Solution**:

- Verify multiple keys are set in `.env.local`
- Check the console log on startup for "Loaded X API key(s)"
- Restart your development server after adding new keys

### Rate limits still occurring

**Issue**: Still hitting rate limits with multiple keys

**Solution**:

- Add more API keys (up to 5 total)
- Check your Google Cloud quotas
- Consider implementing request queuing or throttling

## Technical Details

### Implementation

The load balancer is implemented in `lib/ai/gemini-key-balancer.ts` and uses:

- Singleton pattern for global state management
- Round-robin algorithm for key selection
- Usage statistics tracking for monitoring
- Lazy initialization for optimal performance

### Integration Points

The balancer integrates with:

- `lib/ai/providers.ts` - Main AI provider configuration
- All Gemini model calls (chat, reasoning, title generation, artifacts, images)

## Security Considerations

- API keys are never logged in full (only first 8 characters in stats)
- Keys are stored only in environment variables
- The stats endpoint should be protected in production (add authentication)
- Consider using environment-specific keys for dev/staging/production

## Future Enhancements

Potential improvements for the load balancer:

- Weighted distribution based on key quotas
- Automatic retry with different key on rate limit errors
- Health checking for individual keys
- Dynamic key addition/removal without restart
- Per-model key assignment for specialized use cases
