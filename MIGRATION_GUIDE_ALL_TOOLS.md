# Migration Guide: Update All Tools to Use Simple Search Workflow

## Overview

You have **8 tool wrappers** that need to be updated to use the new `simpleSearchWorkflow`:

| Tool                                   | Current Workflow                | Status  |
| -------------------------------------- | ------------------------------- | ------- |
| `quick-fact-search-tool.ts`            | `simpleSearchWorkflow`          | ✅ DONE |
| `advanced-search-workflow-tool.ts`     | `simpleSearchWorkflow`          | ✅ DONE |
| `standard-research-tool.ts`            | `basicSearchWorkflow`           | ❌ TODO |
| `deep-research-tool.ts`                | `advancedSearchWorkflow`        | ❌ TODO |
| `comprehensive-research-tool.ts`       | `comprehensiveAnalysisWorkflow` | ❌ TODO |
| `basic-search-workflow-tool.ts`        | `basicSearchWorkflow`           | ❌ TODO |
| `low-advance-search-workflow-tool.ts`  | `lowAdvanceSearchWorkflow`      | ❌ TODO |
| `high-advance-search-workflow-tool.ts` | `highAdvanceSearchWorkflow`     | ❌ TODO |

## Migration Pattern

Each tool follows the same pattern. Here's the template:

### Before (Example: standard-research-tool.ts)

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { basicSearchWorkflow } from "../workflows/basic-search-workflow";

export const standardResearchTool = createTool({
  id: "standard-research",
  // ... description ...

  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe" } = context;

    const run = await basicSearchWorkflow.createRunAsync();
    const result = await run.start({
      inputData: { query, jurisdiction },
    });

    // Extract from old step name
    const synthesizeStep = result.steps.synthesize;
    const output = synthesizeStep.output as { ... };

    return output;
  },
});
```

### After (Updated)

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

export const standardResearchTool = createTool({
  id: "standard-research",
  // ... description ...

  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.string().default("Zimbabwe"),
    conversationHistory: z
      .array(z.object({ role: z.string(), content: z.string() }))
      .optional()
      .default([]),
  }),

  execute: async ({ context }) => {
    const { query, jurisdiction = "Zimbabwe", conversationHistory = [] } = context;

    const run = await simpleSearchWorkflow.createRunAsync();
    const result = await run.start({
      inputData: { query, jurisdiction, conversationHistory },
    });

    // Extract from NEW step name
    const coordinatorStep = result.steps["search-coordinator"];
    const output = coordinatorStep.output as { ... };

    return output;
  },
});
```

## Key Changes

1. **Import:** Change from old workflow to `simpleSearchWorkflow`
2. **Input Schema:** Add `conversationHistory` parameter
3. **Execute:** Pass `conversationHistory` to workflow
4. **Step Name:** Change from `synthesize` to `search-coordinator`

## Tool-by-Tool Migration

### 1. standard-research-tool.ts

**Changes:**

```typescript
// Line 3: Change import
- import { basicSearchWorkflow } from "../workflows/basic-search-workflow";
+ import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

// Line 15: Add conversationHistory to inputSchema
inputSchema: z.object({
  query: z.string(),
  jurisdiction: z.string().default("Zimbabwe"),
+ conversationHistory: z.array(z.object({
+   role: z.string(),
+   content: z.string(),
+ })).optional().default([]),
}),

// Line 25: Update execute function
- const { query, jurisdiction = "Zimbabwe" } = context;
+ const { query, jurisdiction = "Zimbabwe", conversationHistory = [] } = context;

// Line 30: Change workflow
- const run = await basicSearchWorkflow.createRunAsync();
+ const run = await simpleSearchWorkflow.createRunAsync();

// Line 32: Pass conversationHistory
const result = await run.start({
  inputData: {
    query,
    jurisdiction,
+   conversationHistory,
  },
});

// Line 45: Change step name
- const synthesizeStep = result.steps.synthesize;
+ const coordinatorStep = result.steps["search-coordinator"];
```

### 2. deep-research-tool.ts

**Changes:**

```typescript
// Line 3: Change import
- import { advancedSearchWorkflow } from "../workflows/advanced-search-workflow";
+ import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

// Same pattern as above for:
// - inputSchema (add conversationHistory)
// - execute (extract conversationHistory, pass to workflow)
// - step name (change to "search-coordinator")
```

### 3. comprehensive-research-tool.ts

**Changes:**

```typescript
// Line 3: Change import
- import { comprehensiveAnalysisWorkflow } from "../workflows/comprehensive-analysis-workflow";
+ import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

// Same pattern as above
```

### 4. basic-search-workflow-tool.ts

**Changes:**

```typescript
// Line 3: Change import
- import { basicSearchWorkflow } from "../workflows/basic-search-workflow";
+ import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

// Same pattern as above
```

### 5. low-advance-search-workflow-tool.ts

**Changes:**

```typescript
// Line 3: Change import
- import { lowAdvanceSearchWorkflow } from "../workflows/low-advance-search-workflow";
+ import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

// Same pattern as above
```

### 6. high-advance-search-workflow-tool.ts

**Changes:**

```typescript
// Line 3: Change import
- import { highAdvanceSearchWorkflow } from "../workflows/high-advance-search-workflow";
+ import { simpleSearchWorkflow } from "../workflows/simple-search-workflow";

// Same pattern as above
```

## Testing Checklist

After each migration, test:

- [ ] Tool can be called successfully
- [ ] Results are returned
- [ ] Sources are included
- [ ] No errors in console
- [ ] Quality is maintained or improved

## Rollback Plan

If issues arise:

1. Keep old workflow files (don't delete)
2. Revert import in tool wrapper
3. Test old workflow still works
4. Debug new workflow separately

## Expected Improvements

After migration, you should see:

- ✅ Faster responses (2-4s vs 4-47s)
- ✅ More consistent quality
- ✅ Better case finding (like Zuva case)
- ✅ Lower token usage
- ✅ Fewer errors

## Timeline

- **Day 1:** Migrate 2 tools, test thoroughly
- **Day 2:** Migrate 2 more tools, test
- **Day 3:** Migrate remaining 2 tools, test
- **Day 4:** Monitor production, gather feedback
- **Day 5:** Deprecate old workflows if all good

## Questions to Consider

1. **Should all tools use the same workflow?**

   - Yes! The simplified workflow handles all cases

2. **What about token budgets?**

   - The new workflow is more efficient (2-4K tokens)
   - Adjust maxResults if needed (currently 20)

3. **What about different search depths?**

   - Chat Agent handles depth automatically
   - No need for separate workflows

4. **What about conversation history?**
   - Add it to all tools (even if not used yet)
   - Future-proofs for when we pass it from agent

## Next Steps

1. Start with `standard-research-tool.ts` (most used)
2. Test thoroughly
3. Migrate remaining tools
4. Monitor for issues
5. Deprecate old workflows

Would you like me to start migrating the tools now?
