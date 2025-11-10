# Environment Configuration Guide

This guide explains how to configure the application for different environments (local development, staging, production).

## Environment Variables

### NEXT_PUBLIC_APP_URL

This variable controls the base URL used for:

- Email verification links
- Redirect URLs
- API callbacks

## Environment-Specific Configuration

### Local Development (.env.local)

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Production (.env.production)

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Dynamic URL Resolution

The application uses a smart URL resolution system that automatically detects the environment:

### Browser Environment

When running in the browser, it uses `window.location.origin` for the current domain.

### Server Environment

On the server, it follows this priority:

1. `process.env.NEXT_PUBLIC_APP_URL` (if set)
2. `process.env.VERCEL_URL` (for Vercel deployments)
3. `process.env.URL` (for Netlify deployments)
4. `http://localhost:3000` (fallback)

## Deployment Examples

### Vercel

Set the environment variable in your Vercel dashboard:

- Key: `NEXT_PUBLIC_APP_URL`
- Value: `https://your-app.vercel.app`

### Netlify

Set the environment variable in your Netlify dashboard:

- Key: `NEXT_PUBLIC_APP_URL`
- Value: `https://your-app.netlify.app`

### Docker/Custom

Set the environment variable when running the container:

```bash
docker run -e NEXT_PUBLIC_APP_URL=https://yourdomain.com your-app
```

## Testing

### Local Development

```bash
npm run dev  # Uses http://localhost:3001
```

### Production Testing

```bash
NODE_ENV=production npm run build
NODE_ENV=production npm start
```

## Debugging

To debug which URL is being used, check the server logs for verification URL construction:

```
[REGISTER] Verification URL: https://your-app.vercel.app/verify
```

The `getAppUrl()` function in `lib/utils/url.ts` handles all the logic automatically.
