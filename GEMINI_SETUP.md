# Gemini AI Configuration

## Changes Made

### 1. Installed Google AI SDK

```bash
pnpm add @ai-sdk/google
```

### 2. Updated AI Provider Configuration

**File:** `lib/ai/providers.ts`

Changed from xAI (Grok) to Google Gemini models:

- **Chat Model:** `gemini-2.0-flash-exp` (main conversational model)
- **Reasoning Model:** `gemini-2.0-flash-thinking-exp-1219` (advanced reasoning)
- **Title Model:** `gemini-2.0-flash-exp` (chat title generation)
- **Artifact Model:** `gemini-2.0-flash-exp` (code/document generation)
- **Image Model:** `imagen-3.0-generate-001` (image generation)

### 3. Updated Environment Variables

**File:** `.env.local`

Changed from:

```
XAI_API_KEY=your_key_here
```

To:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### 4. Fixed React Hydration Error

**File:** `components/markdown.tsx`

Added a custom paragraph component to prevent `<pre>` tags from being nested inside `<p>` tags, which was causing hydration errors.

## Getting Your Google AI Studio API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and update it in `.env.local`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your_actual_key_here
   ```

## Testing

The server should automatically reload. Visit http://localhost:3000 and start chatting to test the Gemini integration.

## Available Gemini Models

- **gemini-2.0-flash-exp**: Fast, efficient model for general tasks
- **gemini-2.0-flash-thinking-exp-1219**: Advanced reasoning capabilities
- **gemini-pro**: More capable model (if you need to upgrade)
- **imagen-3.0-generate-001**: Image generation model
