# Tavily Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

Your Tavily integration is already complete! Follow these steps to test and deploy.

---

## Step 1: Verify Setup (30 seconds)

Check that everything is in place:

```bash
# 1. Check environment variable
cat .env.local | grep TAVILY_API_KEY
# Should show: TAVILY_API_KEY=your_tavily_api_key_here

# 2. Check tools exist
ls lib/ai/tools/tavily-*.ts
# Should show: tavily-search.ts, tavily-extract.ts

# 3. Start dev server
pnpm dev
```

✅ If all checks pass, you're ready to test!

---

## Step 2: Test Locally (2 minutes)

Open your app at `http://localhost:3000` and try these queries:

### Test 1: Basic Search

```
Search for "Zimbabwe Labour Act amendments"
```

**Expected:** Search results with sources and URLs

### Test 2: Case Research with Document Creation

```
Find the Bowers v Minister of Lands case and show me the full text
```

**Expected:**

- Search executes
- Full content extracted
- Two documents created in artifact panel
- Sources cited

### Test 3: Constitutional Lookup

```
What does Section 71 of the Zimbabwe Constitution say about property rights?
```

**Expected:**

- Search and extract
- Document created with full text
- Clear explanation

---

## Step 3: Deploy to Vercel (2 minutes)

### Add Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add new variable:

   ```
   Name: TAVILY_API_KEY
   Value: your_tavily_api_key_here
   Environments: Production, Preview, Development
   ```

3. Click **Save**

### Deploy

```bash
# Commit any changes
git add .
git commit -m "Tavily integration ready"

# Push to deploy
git push origin main
```

### Test Production

1. Wait for deployment to complete (1-2 minutes)
2. Visit your production URL
3. Try the same test queries
4. Verify everything works

---

## Step 4: Monitor Usage (30 seconds)

Visit **Tavily Dashboard:** https://app.tavily.com

Check:

- ✅ Credits used
- ✅ Credits remaining (out of 1,000/month)
- ✅ Request success rate

Set up email alerts for 80% usage.

---

## That's It! 🎉

Your Tavily integration is live and working.

### What You Can Do Now

**Legal Research:**

```
"Find Supreme Court cases on property rights from 2023"
```

**Statute Lookup:**

```
"Get the full text of Zimbabwe Labour Act Section 12"
```

**Current Events:**

```
"What's the latest on Zimbabwe mining regulations?"
```

**Document Drafting:**

```
"Draft a motion citing recent property rights cases"
```

---

## Need More Help?

- **Full Implementation Guide:** `TAVILY_INTEGRATION_COMPLETE.md`
- **Testing Guide:** `TAVILY_TESTING_GUIDE.md`
- **Deployment Checklist:** `VERCEL_DEPLOYMENT_CHECKLIST.md`
- **Complete Summary:** `TAVILY_FINAL_SUMMARY.md`

---

## Quick Troubleshooting

### "TAVILY_API_KEY is not configured"

```bash
# Add to .env.local
echo 'TAVILY_API_KEY=your_tavily_api_key_here' >> .env.local

# Restart dev server
pnpm dev
```

### Search doesn't trigger

- Make sure query is about legal cases or current information
- Try: "Search for [your query]"

### Extract fails

- Some sites block scraping
- Try different URL from search results

---

**Ready to go! Start searching and researching with AI-powered web search.** 🚀
