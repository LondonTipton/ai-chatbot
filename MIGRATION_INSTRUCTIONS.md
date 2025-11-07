# Migration Instructions: V1 → V2 Workflows

## Overview

You now have 4 refactored workflows (V2) that use the simplified Tavily integration pattern. This guide shows how to migrate from the old workflows (V1) to the new ones (V2).

## Quick Reference

| Old Workflow                         | New Workflow                            | Status   |
| ------------------------------------ | --------------------------------------- | -------- |
| `basic-search-workflow.ts`           | `basic-search-workflow-v2.ts`           | ✅ Ready |
| `advanced-search-workflow.ts`        | `advanced-search-workflow-v2.ts`        | ✅ Ready |
| `high-advance-search-workflow.ts`    | `high-advance-search-workflow-v2.ts`    | ✅ Ready |
| `comprehensive-analysis-workflow.ts` | `comprehensive-analysis-workflow-v2.ts` | ✅ Ready |
| `low-advance-search-workflow.ts`     | ❌ Delete (use advanced-v2)             | -        |
| `enhanced-comprehensive-workflow.ts` | ❌ Delete (use comprehensive-v2)        | -        |

## Migration Steps

### Step 1: Test V2 Workflows Independently

Before updating tool wrappers, test each V2 workflow directly:

```typescript
// Test basic-search-workflow-v2
import { basicSearchWorkflowV2 } from "./mastra/workflows/basic-search-workflow-v2";

const run = await basicSearchWorkflowV2.createRunAsync();
const result = await run.start({
  inputData: {
    query: "what is the zuva case in zimbabwean labour law?",
    jurisdiction: "Zimbabwe",
    conversationHistory: [],
  },
});

console.log("Status:", result.status);
console.log("Response:", result.steps.search.output.response);
console.log("Sources:", result.steps.search.output.sources.length);
```

### Step 2: Update Tool Wrappers

Update each tool wrapper to use the V2 workflow:

#### Example: quick-fact-search-tool.ts

```typescript
// OLD
import { basicSearchWorkflow } from "../workflows/basic-search-workflow";

export const quickFactSearchTool = createTool({
  // ...
  execute: async ({ context }) => {
    const run = await basicSearchWorkflow.createRunAsync();
    const result = await run.start({ inputData: { query, jurisdiction } });

    const synthesizeStep = result.steps.synthesize; // OLD step name
    // ...
  },
});

// NEW
import { basicSearchWorkflowV2 } from "../workflows/basic-search-workflow-v2";

export const quickFactSearchTool = createTool({
  // ...
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
    conversationHistory: z
      .array(
        z.object({
          role: z.string(),
          content: z.string(),
        })
      )
      .optional()
      .default([]),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction, conversationHistory } = context;

    const run = await basicSearchWorkflowV2.createRunAsync();
    const result = await run.start({
      inputData: { query, jurisdiction, conversationHistory },
    });

    const searchStep = result.steps.search; // NEW step name
    // ...
  },
});
```

### Step 3: Update All Tool Wrappers

Apply the same pattern to all tool wrappers:

#### Tools to Update

1. **quick-fact-search-tool.ts**

   - Change: `basicSearchWorkflow` → `basicSearchWorkflowV2`
   - Step: `synthesize` → `search`

2. **standard-research-tool.ts**

   - Change: `basicSearchWorkflow` → `basicSearchWorkflowV2`
   - Step: `synthesize` → `search`

3. **deep-research-tool.ts**

   - Change: `advancedSearchWorkflow` → `advancedSearchWorkflowV2`
   - Step: `synthesize` → `search`

4. **advanced-search-workflow-tool.ts**

   - Already uses `simpleSearchWorkflow` ✅
   - Or change to: `advancedSearchWorkflowV2`
   - Step: `search-coordinator` → `search`

5. **comprehensive-research-tool.ts**

   - Change: `comprehensiveAnalysisWorkflow` → `comprehensiveAnalysisWorkflowV2`
   - Step: `document` → `follow-up-searches`

6. **basic-search-workflow-tool.ts**

   - Change: `basicSearchWorkflow` → `basicSearchWorkflowV2`
   - Step: `synthesize` → `search`

7. **low-advance-search-workflow-tool.ts**

   - Change: `lowAdvanceSearchWorkflow` → `advancedSearchWorkflowV2`
   - Step: `synthesize` → `search`

8. **high-advance-search-workflow-tool.ts**
   - Change: `highAdvanceSearchWorkflow` → `highAdvanceSearchWorkflowV2`
   - Step: `synthesize` → `search`

### Step 4: Update Step Name References

**Critical:** The step names have changed in V2 workflows:

| Workflow         | Old Step Name | New Step Name        |
| ---------------- | ------------- | -------------------- |
| Basic V2         | `synthesize`  | `search`             |
| Advanced V2      | `synthesize`  | `search`             |
| High-Advanced V2 | `synthesize`  | `search`             |
| Comprehensive V2 | `document`    | `follow-up-searches` |

Update all references:

```typescript
// OLD
const synthesizeStep = result.steps.synthesize;
const output = synthesizeStep.output as { ... };

// NEW (Basic, Advanced, High-Advanced)
const searchStep = result.steps.search;
const output = searchStep.output as { ... };

// NEW (Comprehensive)
const finalStep = result.steps["follow-up-searches"];
const output = finalStep.output as { ... };
```

### Step 5: Add Conversation History Support

All V2 workflows support conversation history. Update tool input schemas:

```typescript
inputSchema: z.object({
  query: z.string(),
  jurisdiction: z.string().default("Zimbabwe"),
  conversationHistory: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
}),
```

### Step 6: Test Each Tool After Migration

After updating each tool, test it:

```typescript
// Test the tool
const result = await quickFactSearchTool.execute({
  context: {
    query: "what is the zuva case?",
    jurisdiction: "Zimbabwe",
    conversationHistory: [],
  },
});

console.log("Response:", result.response);
console.log("Sources:", result.sources.length);
console.log("Tokens:", result.totalTokens);
```

### Step 7: Delete Redundant Workflows

Once all tools are migrated and tested, delete:

```bash
# Delete redundant workflows
rm mastra/workflows/low-advance-search-workflow.ts
rm mastra/workflows/enhanced-comprehensive-workflow.ts

# Update tools that used them
# low-advance-search-workflow-tool.ts → use advanced-search-workflow-v2
# enhanced-comprehensive-workflow-tool.ts → use comprehensive-analysis-workflow-v2
```

### Step 8: Rename V2 Workflows (Optional)

Once V2 workflows are stable, you can rename them to replace V1:

```bash
# Backup old workflows
mv mastra/workflows/basic-search-workflow.ts mastra/workflows/basic-search-workflow-v1-backup.ts
mv mastra/workflows/advanced-search-workflow.ts mastra/workflows/advanced-search-workflow-v1-backup.ts
mv mastra/workflows/high-advance-search-workflow.ts mastra/workflows/high-advance-search-workflow-v1-backup.ts
mv mastra/workflows/comprehensive-analysis-workflow.ts mastra/workflows/comprehensive-analysis-workflow-v1-backup.ts

# Rename V2 to main
mv mastra/workflows/basic-search-workflow-v2.ts mastra/workflows/basic-search-workflow.ts
mv mastra/workflows/advanced-search-workflow-v2.ts mastra/workflows/advanced-search-workflow.ts
mv mastra/workflows/high-advance-search-workflow-v2.ts mastra/workflows/high-advance-search-workflow.ts
mv mastra/workflows/comprehensive-analysis-workflow-v2.ts mastra/workflows/comprehensive-analysis-workflow.ts

# Update imports in tools
# Change: basicSearchWorkflowV2 → basicSearchWorkflow
# etc.
```

## Rollback Plan

If issues arise, you can easily rollback:

1. **Keep old workflows** - Don't delete V1 workflows immediately
2. **Revert imports** - Change imports back to V1 workflows
3. **Test old workflow** - Verify V1 still works
4. **Debug V2** - Fix issues in V2 separately

## Testing Checklist

For each migrated tool:

- [ ] Tool can be called successfully
- [ ] Results are returned
- [ ] Sources are included
- [ ] Token usage is within budget
- [ ] Latency is acceptable
- [ ] Quality is maintained or improved
- [ ] Zuva case test passes
- [ ] No errors in console

## Common Issues & Solutions

### Issue 1: Step not found

```
Error: result.steps.synthesize is undefined
```

**Solution:** Update step name to `search` or `follow-up-searches`

### Issue 2: Missing conversationHistory

```
Error: conversationHistory is not defined
```

**Solution:** Add conversationHistory to input schema and extract from context

### Issue 3: Wrong workflow imported

```
Error: Cannot find module 'basic-search-workflow-v2'
```

**Solution:** Check import path and file name

### Issue 4: Output schema mismatch

```
Error: Property 'response' does not exist
```

**Solution:** Update output type to match V2 schema

## Timeline

Recommended migration timeline:

- **Day 1:** Test all V2 workflows independently
- **Day 2:** Migrate 2 tools (quick-fact-search, standard-research)
- **Day 3:** Migrate 2 tools (deep-research, advanced-search-workflow)
- **Day 4:** Migrate 2 tools (comprehensive-research, basic-search-workflow)
- **Day 5:** Migrate 2 tools (low-advance, high-advance)
- **Day 6:** Integration testing
- **Day 7:** Production deployment

## Success Criteria

Migration is successful when:

- ✅ All 8 tools use V2 workflows
- ✅ All tests pass
- ✅ Token usage is within budget
- ✅ Latency is improved
- ✅ Quality is maintained or improved
- ✅ No production errors
- ✅ User feedback is positive

## Support

If you encounter issues:

1. Check the step name (most common issue)
2. Verify conversation history is passed
3. Test the workflow directly (bypass tool wrapper)
4. Check console logs for errors
5. Compare with working tool (e.g., quick-fact-search)

## Next Steps

1. Start with testing V2 workflows
2. Migrate one tool at a time
3. Test thoroughly after each migration
4. Monitor production metrics
5. Gather feedback
6. Iterate and improve

Ready to start migration! 🚀
