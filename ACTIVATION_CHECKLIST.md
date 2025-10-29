# Activation Checklist: Intelligent Routing System

## ✅ Pre-Activation Checks

### 1. Test Routing Logic

```bash
pnpm test:routing
```

**Expected**: All 8 tests pass ✅

**Status**: ✅ PASSED (8/8 tests)

### 2. Verify Environment Variables

```bash
# Check .env.local or .env
TAVILY_API_KEY=your_key_here
CEREBRAS_API_KEY=your_key_here
# Or multiple keys:
CEREBRAS_API_KEY_1=key1
CEREBRAS_API_KEY_2=key2
```

**Required**:

- ✅ TAVILY_API_KEY (for search/extract)
- ✅ CEREBRAS_API_KEY (for models)

### 3. Review Implementation

- ✅ 17 files created/updated
- ✅ Complexity detector working
- ✅ All agents registered in Mastra
- ✅ Workflows committed
- ✅ Routing logic implemented

## 🚀 Activation Options

### Option A: Safe Gradual Rollout (Recommended)

**Step 1**: Keep current route as backup

```bash
# Current route stays at: app/(chat)/api/chat/route.ts
# No changes needed
```

**Step 2**: Create parallel test endpoint

```bash
# Create new endpoint for testing
cp app/\(chat\)/api/chat/route-with-routing.ts app/\(chat\)/api/chat-v2/route.ts
```

**Step 3**: Test with specific users

- Direct test users to `/api/chat-v2`
- Monitor performance and accuracy
- Gather feedback

**Step 4**: Full rollout when confident

```bash
# Replace main route
mv app/\(chat\)/api/chat/route.ts app/\(chat\)/api/chat/route-backup.ts
mv app/\(chat\)/api/chat/route-with-routing.ts app/\(chat\)/api/chat/route.ts
```

### Option B: Direct Activation

**Step 1**: Backup current route

```bash
mv app/\(chat\)/api/chat/route.ts app/\(chat\)/api/chat/route-backup.ts
```

**Step 2**: Activate new routing

```bash
mv app/\(chat\)/api/chat/route-with-routing.ts app/\(chat\)/api/chat/route.ts
```

**Step 3**: Restart server

```bash
pnpm dev
```

## 📊 Post-Activation Monitoring

### 1. Watch Logs

Look for routing indicators:

```
[Routing] Query: "..."
[Routing] Complexity: medium
[Routing] Reasoning: ...
[Routing] 🟢 Routing to Mastra (medium)
```

or

```
[Routing] 🔵 Using AI SDK (simple)
[Routing] Active tools: tavilyQna, createDocument
```

### 2. Test Each Complexity Level

#### Simple (AI SDK + QNA)

```
Query: "What is contract law?"
Expected: Fast response (1-2s)
Route: AI SDK
Tool: tavilyQna
```

#### Light (AI SDK + Advanced)

```
Query: "Explain property rights in Zimbabwe"
Expected: Detailed response (2-4s)
Route: AI SDK
Tool: tavilyAdvancedSearch
```

#### Medium (Mastra Agent)

```
Query: "Find cases about labor disputes"
Expected: Multiple searches (5-10s)
Route: Mastra
Agent: mediumResearchAgent
```

#### Deep (Mastra Workflow)

```
Query: "Compare IP precedents"
Expected: Full workflow (15-30s)
Route: Mastra
Workflow: deepResearchWorkflow
```

#### Workflow (Mastra Multi-Agent)

```
Query: "Review this contract"
Expected: Multi-step analysis (10-20s)
Route: Mastra
Workflow: documentReviewWorkflow
```

### 3. Monitor Performance

| Metric            | Target | How to Check    |
| ----------------- | ------ | --------------- |
| Response Time     | <30s   | Watch logs      |
| Error Rate        | <1%    | Monitor errors  |
| Cost per Query    | <$0.02 | Track API calls |
| User Satisfaction | >90%   | Gather feedback |

### 4. Check Tool Call Limits

Verify agents respect max 4 tool calls:

```
[Mastra Agent] Tool call 1/4
[Mastra Agent] Tool call 2/4
[Mastra Agent] Tool call 3/4
[Mastra Agent] Tool call 4/4
[Mastra Agent] Max steps reached
```

## 🔧 Troubleshooting

### Issue: Tests failing

**Solution**:

```bash
pnpm test:routing
# Review failed tests
# Adjust complexity indicators if needed
```

### Issue: Mastra agent not found

**Solution**: Check `mastra/index.ts`

```typescript
export const mastra = new Mastra({
  agents: {
    mediumResearchAgent, // ← Must be imported
    searchAgent,
    extractAgent,
    analysisAgent,
  },
});
```

### Issue: Workflow not executing

**Solution**: Verify workflow is committed

```typescript
workflow.step(step1).then(step2).commit(); // ← Must call commit()
```

### Issue: Tool calls exceeding limit

**Solution**: Check maxSteps parameter

```typescript
await agent.generate(message, {
  maxSteps: 4, // ← Hard limit
});
```

### Issue: Streaming not working

**Solution**: Ensure chatRoute() is used

```typescript
const stream = await agent.stream(message);
return chatRoute(stream); // ← Transforms to AI SDK format
```

## 📋 Rollback Plan

If you need to revert:

```bash
# Restore original route
mv app/\(chat\)/api/chat/route-backup.ts app/\(chat\)/api/chat/route.ts

# Remove new route
rm app/\(chat\)/api/chat/route-with-routing.ts

# Restart server
pnpm dev
```

## ✅ Final Checklist

Before activating, confirm:

- [ ] All tests pass (`pnpm test:routing`)
- [ ] Environment variables set
- [ ] Backup of current route created
- [ ] Documentation reviewed
- [ ] Monitoring plan in place
- [ ] Rollback plan understood
- [ ] Team notified (if applicable)

## 🎯 Success Criteria

System is working correctly if:

✅ Routing decisions match expected complexity
✅ Response times within targets
✅ Tool call limits respected
✅ Streaming works seamlessly
✅ Error rate <1%
✅ User feedback positive

## 📚 Documentation

- **QUICK_START_ROUTING.md** - Quick start guide
- **INTELLIGENT_ROUTING_IMPLEMENTATION.md** - Full technical docs
- **ROUTING_ARCHITECTURE.md** - Visual diagrams
- **IMPLEMENTATION_SUMMARY.md** - Overview
- **ACTIVATION_CHECKLIST.md** - This file

## 🚀 Ready to Activate?

1. ✅ Tests pass
2. ✅ Environment configured
3. ✅ Documentation reviewed
4. ✅ Monitoring ready
5. ✅ Rollback plan clear

**Choose your activation option above and proceed!**

---

**Status**: ✅ Ready for activation
**Tests**: ✅ 8/8 passed
**Files**: ✅ 17 created/updated
**Documentation**: ✅ Complete
