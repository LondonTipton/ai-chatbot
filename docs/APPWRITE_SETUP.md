# Appwrite Setup & Configuration

This document consolidates all Appwrite-related setup, authentication, and email verification information.

## Platform Setup

### Initial Configuration

1. Create Appwrite project at https://cloud.appwrite.io
2. Set project ID in `appwrite.config.json`
3. Configure environment variables in `.env.local`:
   ```
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   ```

### Database Setup

- Collection: `users`
- Attributes: email, name, createdAt, etc.
- Indexes: email (unique)

## Authentication

### Session Management

- Uses Appwrite's built-in session management
- Client-side: React Context (`AuthContext`)
- Server-side: Cookie-based sessions with `x-appwrite-session` header
- Session persistence across page reloads

### Auth Flow

1. User registers/logs in via Appwrite SDK
2. Session cookie automatically set by Appwrite
3. Client syncs session state with server
4. Middleware validates session on protected routes

## Email Verification

### Configuration

1. Enable email verification in Appwrite Console → Auth → Settings
2. Configure SMTP settings or use Appwrite's default email service
3. Set verification URL: `https://yourdomain.com/verify`

### Verification Flow

1. User registers → Appwrite sends verification email
2. User clicks link → redirected to `/verify?userId=xxx&secret=xxx`
3. App calls `account.updateVerification()` with secret
4. User redirected to dashboard on success

### Troubleshooting

- Check SMTP configuration in Appwrite Console
- Verify email templates are enabled
- Check spam folder for verification emails
- Use Appwrite logs to debug email sending issues

## Common Issues

### Session Not Persisting

- Ensure cookies are enabled
- Check SameSite cookie settings
- Verify HTTPS in production

### Email Not Sending

- Check SMTP credentials
- Verify sender email is configured
- Check Appwrite email quota limits

### CORS Errors

- Add your domain to Appwrite Console → Settings → Platforms
- Include both development and production URLs

## Reference

- Appwrite Docs: https://appwrite.io/docs
- Auth Guide: https://appwrite.io/docs/products/auth
- Email Service: https://appwrite.io/docs/products/messaging
