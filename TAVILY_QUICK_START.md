# Tavily Search - Quick Start Guide

Get DeepCounsel's web search capability up and running in 3 minutes.

## Step 1: Get Your API Key

1. Go to [tavily.com](https://tavily.com)
2. Sign up (free tier available)
3. Copy your API key from the dashboard

## Step 2: Add to Environment

Open your `.env.local` file and add:

```bash
TAVILY_API_KEY=tvly-your-actual-key-here
```

## Step 3: Restart

```bash
pnpm dev
```

## That's It!

DeepCounsel can now search the web for current legal information.

## Try It Out

Ask questions like:

- "What are recent amendments to Zimbabwe's Labour Act?"
- "Find Supreme Court cases on property rights in Zimbabwe"
- "What are the current company registration requirements?"

The AI will automatically search when needed and cite sources.

## Free Tier Limits

- 1,000 searches per month
- Perfect for development and testing
- Upgrade to Pro for production use

## Need Help?

See [TAVILY_SEARCH_INTEGRATION.md](./TAVILY_SEARCH_INTEGRATION.md) for detailed documentation.

## Common Issues

**Search not working?**

- Check API key is in `.env.local`
- Restart your dev server
- Verify key at tavily.com/dashboard

**Rate limit errors?**

- Check usage at tavily.com/dashboard
- Wait for monthly reset
- Consider upgrading to Pro tier
