# Tavily Integration - Testing Guide

## Quick Test Commands

Test your Tavily integration with these example queries in your chat interface.

---

## 🧪 Test Suite

### Test 1: Basic Search (1 credit)

**Query:**

```
Search for "Zimbabwe Labour Act recent amendments"
```

**Expected Result:**

- AI calls `tavilySearch` automatically
- Returns 5-7 search results
- Shows titles, URLs, and content snippets
- Includes relevance scores
- Cites sources

**Success Criteria:**

- ✅ Search executes without errors
- ✅ Results are relevant to Zimbabwe labour law
- ✅ URLs are from authoritative sources
- ✅ AI presents results clearly

---

### Test 2: Case Law Search with Extraction (3-4 credits)

**Query:**

```
Find the Bowers v Minister of Lands case and show me the full text
```

**Expected Result:**

1. AI searches for the case
2. Finds relevant URLs (zimlii.org, court sites)
3. Extracts full case text from top URL
4. Creates document artifact with full case
5. Creates second document with summary
6. Cites source URL

**Success Criteria:**

- ✅ Search finds the correct case
- ✅ Extract gets full case text
- ✅ Two documents created in artifact panel
- ✅ First document has full case text
- ✅ Second document has summary/analysis
- ✅ Sources cited with URLs

---

### Test 3: Constitutional Provision (2-3 credits)

**Query:**

```
What does Section 71 of the Zimbabwe Constitution say about property rights?
```

**Expected Result:**

- Searches for constitutional text
- Extracts relevant section
- Creates document with full text
- Provides explanation and context
- Cites official sources

**Success Criteria:**

- ✅ Finds constitutional text
- ✅ Extracts full section
- ✅ Document created with provision
- ✅ Clear explanation provided

---

### Test 4: Recent News (1 credit)

**Query:**

```
What are the latest developments in Zimbabwe mining regulations?
```

**Expected Result:**

- Searches recent news
- Returns current articles
- Summarizes findings
- Cites sources with dates

**Success Criteria:**

- ✅ Recent results (within last few months)
- ✅ Relevant to mining regulations
- ✅ Multiple sources cited
- ✅ Clear summary provided

---

### Test 5: Multi-Step Research (5-7 credits)

**Query:**

```
Find three recent Supreme Court cases on property rights and create a comparison document
```

**Expected Result:**

1. Searches for property rights cases
2. Identifies 3 relevant cases
3. Extracts full text from each
4. Creates comparison document
5. Analyzes similarities and differences
6. Cites all sources

**Success Criteria:**

- ✅ Finds 3 distinct cases
- ✅ Extracts content from each
- ✅ Creates comprehensive comparison
- ✅ All sources cited

---

### Test 6: Domain-Specific Search (1 credit)

**Query:**

```
Search only government websites for Zimbabwe tax regulations
```

**Expected Result:**

- AI uses `includeDomains: ["gov.zw"]`
- Returns only .gov.zw results
- Relevant to tax regulations

**Success Criteria:**

- ✅ All results from .gov.zw domain
- ✅ Relevant to tax regulations
- ✅ Authoritative sources

---

### Test 7: Error Handling

**Query:**

```
Search for "xyzabc123nonexistent"
```

**Expected Result:**

- Search executes
- Returns "no results found" or limited results
- AI continues conversation gracefully
- Offers to try different search terms

**Success Criteria:**

- ✅ No crashes or errors
- ✅ Graceful handling of no results
- ✅ Helpful suggestions provided

---

## 🔍 Manual Testing Checklist

### Before Testing

- [ ] `.env.local` has `TAVILY_API_KEY` set
- [ ] Dev server restarted after adding key
- [ ] No console errors on startup

### During Testing

- [ ] Search tool activates automatically
- [ ] Results appear in chat
- [ ] Document artifacts created when appropriate
- [ ] Sources cited with URLs
- [ ] No API errors in console

### After Testing

- [ ] Check Tavily dashboard for usage: https://app.tavily.com
- [ ] Verify credit consumption is reasonable
- [ ] Review quality of search results
- [ ] Test on different types of queries

---

## 📊 Expected Credit Usage

| Test      | Credits   | Breakdown                                            |
| --------- | --------- | ---------------------------------------------------- |
| Test 1    | 1         | Basic search                                         |
| Test 2    | 3-4       | Advanced search (2) + extract (1-2)                  |
| Test 3    | 2-3       | Basic search (1) + extract (1-2)                     |
| Test 4    | 1         | Basic search                                         |
| Test 5    | 5-7       | Advanced search (2) + 3 extracts (3) + follow-up (2) |
| Test 6    | 1         | Basic search                                         |
| Test 7    | 1         | Basic search                                         |
| **Total** | **14-20** | Out of 1,000/month                                   |

---

## 🐛 Common Issues & Solutions

### Issue: "TAVILY_API_KEY is not configured"

```bash
# Solution: Add to .env.local
echo 'TAVILY_API_KEY=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' >> .env.local

# Restart dev server
pnpm dev
```

### Issue: Search doesn't trigger automatically

**Check:**

- Is the query about current information or legal cases?
- System prompt should trigger search for legal queries
- Try more explicit: "Search for..."

### Issue: Extract fails

**Possible causes:**

- URL blocks scraping
- Site requires authentication
- Complex page structure

**Solution:**

- Try different URL from search results
- Use `extractDepth: "advanced"`

### Issue: No documents created

**Check:**

- AI should create documents after extraction
- Look for "createDocument" in tool calls
- May need to explicitly ask: "create a document with this"

---

## 🎯 Success Metrics

After testing, verify:

### Functionality

- ✅ Search works for legal queries
- ✅ Extract gets full content
- ✅ Documents created automatically
- ✅ Multi-step workflows function
- ✅ Error handling is graceful

### Quality

- ✅ Search results are relevant
- ✅ Extracted content is clean
- ✅ Documents are well-formatted
- ✅ Sources are authoritative
- ✅ Citations are accurate

### Performance

- ✅ Search completes in <3 seconds
- ✅ Extract completes in <5 seconds
- ✅ No timeouts or hangs
- ✅ Reasonable credit usage

### User Experience

- ✅ AI explains what it's doing
- ✅ Results are easy to understand
- ✅ Documents are useful
- ✅ Sources are clickable
- ✅ Workflow feels natural

---

## 📝 Test Results Template

Use this to document your testing:

```markdown
## Test Results - [Date]

### Test 1: Basic Search

- Status: ✅ Pass / ❌ Fail
- Credits used: X
- Notes:

### Test 2: Case Law Search

- Status: ✅ Pass / ❌ Fail
- Credits used: X
- Documents created: X
- Notes:

### Test 3: Constitutional Provision

- Status: ✅ Pass / ❌ Fail
- Credits used: X
- Notes:

### Test 4: Recent News

- Status: ✅ Pass / ❌ Fail
- Credits used: X
- Notes:

### Test 5: Multi-Step Research

- Status: ✅ Pass / ❌ Fail
- Credits used: X
- Documents created: X
- Notes:

### Test 6: Domain-Specific

- Status: ✅ Pass / ❌ Fail
- Credits used: X
- Notes:

### Test 7: Error Handling

- Status: ✅ Pass / ❌ Fail
- Notes:

### Overall Assessment

- Total credits used: X / 1000
- Success rate: X%
- Issues found: X
- Ready for production: Yes / No
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**

   - Deploy to Vercel
   - Add `TAVILY_API_KEY` to Vercel environment variables
   - Test in production
   - Monitor usage

2. **If issues found:**

   - Document specific failures
   - Check console for errors
   - Review tool configurations
   - Adjust system prompts if needed

3. **Optimization:**
   - Add caching for common queries
   - Implement usage tracking
   - Set up monitoring/alerts
   - Consider rate limiting per user

---

## 📞 Support

If you encounter issues:

1. **Check Tavily Status:** https://status.tavily.com
2. **Review API Docs:** https://docs.tavily.com
3. **Check Usage:** https://app.tavily.com
4. **Console Logs:** Look for error messages
5. **Network Tab:** Check API requests/responses

---

**Happy Testing! 🎉**
