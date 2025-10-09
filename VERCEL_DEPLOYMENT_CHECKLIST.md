# Vercel Deployment Checklist - Tavily Integration

## Pre-Deployment Checklist

### ✅ Local Testing Complete

- [ ] All Tavily tests pass locally
- [ ] Search functionality works
- [ ] Extract functionality works
- [ ] Document creation works
- [ ] Error handling verified
- [ ] No console errors

### ✅ Code Ready

- [ ] All changes committed to git
- [ ] `.env.local` NOT committed (in `.gitignore`)
- [ ] `.env.example` updated with `TAVILY_API_KEY`
- [ ] TypeScript compiles without errors
- [ ] Linting passes

### ✅ Environment Variables Documented

- [ ] All required variables listed in `.env.example`
- [ ] Tavily API key obtained from https://app.tavily.com
- [ ] Other API keys ready (Google, Blob, Postgres, Redis)

---

## Deployment Steps

### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git status

# Add any uncommitted files
git add .

# Commit with descriptive message
git commit -m "Add Tavily integration for legal research"

# Push to main branch
git push origin main
```

### Step 2: Configure Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add the following variables for **Production**, **Preview**, and **Development**:

#### Required Variables

```bash
# Authentication
AUTH_SECRET=t9+H4MiULcLHFwvCO2kObhVap128DO/CLCudm6duEZ4=

# Google AI (Primary + Load Balancing Keys)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyC4l1fnsk9PPvTvhBOreuuVk5i-2bshakc
GOOGLE_GENERATIVE_AI_API_KEY_1=AIzaSyCqBBllFuJ2uG9Jn86_Vt0qktonmonxChM
GOOGLE_GENERATIVE_AI_API_KEY_2=AIzaSyDe5UZrPkILyoxVHiKKVaQNcg399Mxd0K4
GOOGLE_GENERATIVE_AI_API_KEY_3=AIzaSyBm03ExXI63HpRJnmcyP645ix9y0xY_Wx4
GOOGLE_GENERATIVE_AI_API_KEY_4=AIzaSyBlkp-zPBf6uLGTJBa3Yg1_i36rYZ5AlWw
GOOGLE_GENERATIVE_AI_API_KEY_5=AIzaSyA_Cli4OegvDdfvYoaD97KWFiAIo6sU1e4

# Vercel Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_r7cU583KqcqFb2xx_IpPrJ0yHolXnOWIEd9XV4U4QHNERLx

# Database
POSTGRES_URL=postgresql://neondb_owner:npg_8qPOpWd4bVIA@ep-young-paper-adbt7o4r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Redis (for resumable streams)
REDIS_URL=redis://default:2M4ZYTaTGn43F1bQsD2imLBcZTW7kiX0@redis-10374.c261.us-east-1-4.ec2.redns.redis-cloud.com:10374

# Tavily (NEW - for web search)
TAVILY_API_KEY=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
```

#### Optional Variables

```bash
# AI Gateway (for non-Vercel deployments)
AI_GATEWAY_API_KEY=
```

### Step 3: Deploy

#### Option A: Automatic Deployment (Recommended)

```bash
# Push to main branch triggers automatic deployment
git push origin main

# Monitor deployment in Vercel Dashboard
```

#### Option B: Manual Deployment

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to production
vercel --prod

# Follow prompts
```

### Step 4: Verify Deployment

1. **Check Build Logs**

   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - Review build logs for errors

2. **Check Environment Variables**

   - Settings → Environment Variables
   - Verify all variables are set
   - Ensure `TAVILY_API_KEY` is present

3. **Test Production URL**
   - Open your production URL
   - Try logging in
   - Test a chat query

---

## Post-Deployment Testing

### Test 1: Basic Functionality

```
Visit: https://your-app.vercel.app
Login with your account
Send message: "Hello"
Expected: Normal chat response
```

### Test 2: Tavily Search

```
Send message: "Search for Zimbabwe Labour Act amendments"
Expected:
- Search executes
- Results displayed
- Sources cited
- No errors
```

### Test 3: Tavily Extract + Document Creation

```
Send message: "Find the Bowers v Minister of Lands case and show me the full text"
Expected:
- Search executes
- Extract gets full content
- Documents created in artifact panel
- Sources cited
```

### Test 4: Error Handling

```
Temporarily remove TAVILY_API_KEY from Vercel
Send message: "Search for something"
Expected:
- Graceful error message
- Chat continues to work
- No crashes
```

---

## Monitoring & Maintenance

### Daily Checks (First Week)

- [ ] Check Vercel deployment status
- [ ] Review error logs in Vercel Dashboard
- [ ] Monitor Tavily usage at https://app.tavily.com
- [ ] Check user feedback/reports

### Weekly Checks

- [ ] Review Tavily credit usage
- [ ] Check for API errors in logs
- [ ] Monitor response times
- [ ] Review user queries and results quality

### Monthly Checks

- [ ] Analyze Tavily usage patterns
- [ ] Optimize frequently searched queries (caching)
- [ ] Review and update system prompts
- [ ] Check for Tavily API updates

---

## Usage Monitoring

### Tavily Dashboard

Visit: https://app.tavily.com

**Monitor:**

- Total credits used
- Credits remaining
- Request success rate
- Average response time
- Most common queries

**Alerts:**

- Set up email alerts for 80% usage
- Monitor for unusual spikes
- Track failed requests

### Vercel Analytics

Visit: Vercel Dashboard → Analytics

**Monitor:**

- API route performance
- Error rates
- Response times
- User activity

---

## Scaling Considerations

### If Usage Exceeds Free Tier (1,000 credits/month)

**Option 1: Optimize Usage**

- Implement caching for common queries
- Cache search results for 1 hour
- Cache extracted content for 24 hours
- Reduce `maxResults` for searches

**Option 2: Upgrade Tavily Plan**

- Visit https://app.tavily.com/pricing
- Choose appropriate tier
- Update billing information

**Option 3: Implement Rate Limiting**

```typescript
// In chat API route
const userSearchCount = await getUserSearchCount(userId);
if (userSearchCount > 10) {
  return new Response("Daily search limit reached", { status: 429 });
}
```

---

## Troubleshooting Production Issues

### Issue: "TAVILY_API_KEY is not configured"

**Check:**

1. Vercel Dashboard → Settings → Environment Variables
2. Verify `TAVILY_API_KEY` is set for Production
3. Redeploy if variable was just added

**Fix:**

```bash
# Add variable in Vercel Dashboard
# Then redeploy
vercel --prod
```

### Issue: Search works locally but not in production

**Check:**

1. Environment variable set in Vercel
2. Variable applied to correct environment (Production)
3. Recent deployment includes Tavily code
4. No build errors in deployment logs

**Fix:**

```bash
# Verify environment variables
vercel env ls

# Pull environment variables locally to test
vercel env pull .env.local

# Redeploy
vercel --prod
```

### Issue: Rate limit errors

**Check:**

1. Tavily dashboard for usage
2. Unusual spike in requests
3. Potential abuse or bot traffic

**Fix:**

- Implement per-user rate limiting
- Add caching
- Upgrade Tavily plan
- Block suspicious IPs

### Issue: Slow response times

**Check:**

1. Tavily API status: https://status.tavily.com
2. Network latency
3. Extract depth setting (advanced is slower)

**Fix:**

- Use `searchDepth: "basic"` for faster results
- Implement caching
- Reduce `maxResults`
- Use `extractDepth: "basic"` when possible

---

## Rollback Plan

If deployment causes issues:

### Quick Rollback

```bash
# In Vercel Dashboard
1. Go to Deployments
2. Find previous working deployment
3. Click "..." menu
4. Select "Promote to Production"
```

### Code Rollback

```bash
# Revert to previous commit
git log  # Find previous commit hash
git revert <commit-hash>
git push origin main
```

### Disable Tavily Temporarily

```typescript
// In app/(chat)/api/chat/route.ts
experimental_activeTools: [
  "getWeather",
  "createDocument",
  "updateDocument",
  "requestSuggestions",
  // "tavilySearch",      // Commented out
  // "tavilyExtract",     // Commented out
];
```

---

## Security Checklist

### Before Going Live

- [ ] `.env.local` not committed to git
- [ ] API keys not exposed in client-side code
- [ ] Environment variables encrypted in Vercel
- [ ] Rate limiting considered
- [ ] Error messages don't expose sensitive info
- [ ] CORS properly configured (not needed for server-to-server)
- [ ] Authentication working correctly

### Regular Security Audits

- [ ] Review Vercel access logs
- [ ] Monitor for unusual API usage
- [ ] Check for exposed secrets in code
- [ ] Update dependencies regularly
- [ ] Review user permissions

---

## Success Criteria

Deployment is successful when:

- ✅ Application builds without errors
- ✅ All environment variables set correctly
- ✅ Chat functionality works
- ✅ Tavily search executes successfully
- ✅ Tavily extract works
- ✅ Document creation functions
- ✅ Error handling is graceful
- ✅ No console errors in production
- ✅ Response times acceptable (<5s for search)
- ✅ User experience smooth

---

## Support Resources

### Vercel

- **Dashboard:** https://vercel.com/dashboard
- **Docs:** https://vercel.com/docs
- **Support:** https://vercel.com/support

### Tavily

- **Dashboard:** https://app.tavily.com
- **Docs:** https://docs.tavily.com
- **Status:** https://status.tavily.com
- **Support:** support@tavily.com

### Your Application

- **Repository:** [Your GitHub URL]
- **Production URL:** [Your Vercel URL]
- **Staging URL:** [Your Preview URL]

---

## Final Checklist

Before marking deployment complete:

- [ ] All tests pass in production
- [ ] Environment variables verified
- [ ] Monitoring set up
- [ ] Error tracking configured
- [ ] Usage alerts configured
- [ ] Documentation updated
- [ ] Team notified of new features
- [ ] Rollback plan documented
- [ ] Support contacts saved

---

**Deployment Date:** ******\_******
**Deployed By:** ******\_******
**Production URL:** ******\_******
**Status:** ✅ Complete / ⏳ In Progress / ❌ Issues

---

**🎉 Ready to Deploy!**

Your Tavily integration is production-ready. Follow this checklist step-by-step for a smooth deployment.
