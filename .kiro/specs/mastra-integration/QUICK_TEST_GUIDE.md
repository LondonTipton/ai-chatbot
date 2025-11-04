# Quick Test Guide - Mastra Integration

## Run Automated Tests

```bash
pnpm tsx scripts/test-real-queries.ts
```

**What it tests:**

- Complexity detection for 20 different queries
- Routing decisions (AI SDK vs Mastra)
- All query categories (simple, light, medium, deep, workflows)

**Expected result:** 18/20 passed (90%), 2 routed to better workflows

---

## Manual Testing (5 minutes)

### 1. Enable Mastra

```bash
# In .env.local
ENABLE_MASTRA=true
```

### 2. Start Server

```bash
pnpm dev
```

### 3. Test One Query from Each Category

Open `http://localhost:3000` and test:

**Simple (AI SDK):**

```
What is a contract?
```

Expected: Quick response (< 2s), 50-200 chars

**Medium (Mastra Agent):**

```
Find cases about breach of contract in employment law
```

Expected: 5-10s, 500-1000 chars, multiple sources

**Workflow (Mastra Workflow):**

```
Draft a non-disclosure agreement for a software company
```

Expected: 15-30s, 1000+ chars, document artifact

### 4. Check Console Logs

Look for:

```
[Complexity] ✅ Detected: [complexity]
[Routing] [⚡|🤖] Using [AI SDK|Mastra]
[Mastra] Using [agent|workflow]: [name]
[Usage] Committed transaction [id]
```

### 5. Verify Response

- [ ] Not empty
- [ ] Complete (not truncated)
- [ ] Accurate and relevant
- [ ] Appropriate length
- [ ] No errors

---

## Quick Verification Checklist

- [ ] Automated tests pass (90%+)
- [ ] Simple queries use AI SDK
- [ ] Medium queries use Mastra Agent
- [ ] Workflow queries use Mastra Workflows
- [ ] Responses are complete
- [ ] No console errors
- [ ] Streaming works smoothly

---

## Troubleshooting

**Tests fail?**

- Check `.env.local` has required API keys
- Verify `ENABLE_MASTRA` setting
- Check console for errors

**No response?**

- Check network connection
- Verify API keys are valid
- Check console for error messages

**Wrong routing?**

- Review query wording
- Check complexity detection logs
- Verify `ENABLE_MASTRA=true`

---

## Full Documentation

See `REAL_QUERY_TESTING.md` for:

- Complete test results
- Detailed manual testing instructions
- Response quality criteria
- Error scenario testing
- Performance benchmarks
