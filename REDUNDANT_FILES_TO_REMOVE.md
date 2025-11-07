# Redundant Files After V2 Migration

## Overview

After migrating to V2 workflows (simplified Tavily integration), the following files are now redundant and can be safely removed. These files were part of the old V1 architecture that used entity extraction, validation, and filtering.

## Workflows (V1 - Old Architecture)

### ❌ Can Be Removed

These workflows have been replaced by V2 versions:

1. **mastra/workflows/basic-search-workflow.ts**

   - Replaced by: `basic-search-workflow-v2.ts`
   - Used by: Tests only (can update tests)

2. **mastra/workflows/advanced-search-workflow.ts**

   - Replaced by: `advanced-search-workflow-v2.ts`
   - Used by: Tests and scripts only

3. **mastra/workflows/comprehensive-analysis-workflow.ts**

   - Replaced by: `comprehensive-analysis-workflow-v2.ts`
   - Used by: Tests and scripts only

4. **mastra/workflows/enhanced-comprehensive-workflow.ts**

   - Replaced by: `enhanced-comprehensive-workflow-v2.ts`
   - Used by: Chat route (already updated to V2)

5. **mastra/workflows/low-advance-search-workflow.ts**

   - Replaced by: `low-advance-search-workflow-v2.ts`
   - Used by: Tool wrappers (already updated to V2)

6. **mastra/workflows/high-advance-search-workflow.ts**
   - Replaced by: `high-advance-search-workflow-v2.ts`
   - Used by: Tool wrappers (already updated to V2)

## Agents (V1 - Complex Pipeline)

### ❌ Can Be Removed

These agents were part of the entity extraction/validation pipeline:

1. **mastra/agents/entity-extractor-agent.ts**

   - Purpose: Extract legal entities from text
   - Used by: V1 workflows only
   - V2 Strategy: No entity extraction (pass raw results)

2. **mastra/agents/synthesizer-agent.ts**

   - Purpose: Synthesize validated entities into response
   - Used by: V1 workflows and old agent-orchestrator
   - V2 Strategy: Chat Agent handles synthesis directly

3. **mastra/agents/claim-extractor-agent.ts**

   - Purpose: Extract claims from entities
   - Used by: V1 workflows only
   - V2 Strategy: Not needed (no entity extraction)

4. **mastra/agents/summarizer-agent.ts**
   - Purpose: Summarize search results
   - Used by: V1 workflows only
   - V2 Strategy: Chat Agent handles summarization

## Utilities (V1 - Complex Pipeline)

### ❌ Can Be Removed

These utilities supported the entity extraction/validation pipeline:

1. **lib/utils/entity-validation.ts**

   - Purpose: Validate extracted entities against search results
   - Used by: V1 workflows only
   - V2 Strategy: No validation (pass all results)

2. **lib/utils/entity-merging.ts**

   - Purpose: Merge and deduplicate entities
   - Used by: V1 workflows only
   - V2 Strategy: No entity merging needed

3. **lib/utils/document-composer.ts**

   - Purpose: Compose final document from validated entities
   - Used by: V1 workflows only
   - V2 Strategy: Chat Agent composes response

4. **lib/utils/workflow-entity-steps.ts**

   - Purpose: Reusable entity extraction/validation steps
   - Used by: V1 workflows only
   - V2 Strategy: No entity steps needed

5. **lib/utils/token-budget-tracker.ts**

   - Purpose: Track token usage across workflow steps
   - Used by: Enhanced workflow V1 only
   - V2 Strategy: Simpler approach without budget tracking

6. **lib/types/legal-entities.ts**
   - Purpose: TypeScript types for legal entities
   - Used by: Entity extraction/validation utilities
   - V2 Strategy: Not needed

## Test Files

### ⚠️ Need Updating (Not Removal)

These test files reference V1 workflows and should be updated to test V2:

1. **tests/integration/basic-search-workflow.test.ts**

   - Update to: Test `basic-search-workflow-v2.ts`

2. **tests/integration/advanced-search-workflow.test.ts**

   - Update to: Test `advanced-search-workflow-v2.ts`

3. **tests/integration/comprehensive-analysis-workflow.test.ts**
   - Update to: Test `comprehensive-analysis-workflow-v2.ts`

## Script Files

### ⚠️ Need Updating (Not Removal)

These scripts reference V1 workflows:

1. **scripts/test-advanced-search-workflow.ts**

   - Update to: Test V2 workflow

2. **scripts/test-comprehensive-analysis-workflow.ts**

   - Update to: Test V2 workflow

3. **scripts/test-workflow-tool-integration.ts**

   - Update to: Test V2 workflow

4. **scripts/test-synthesizer-agent.ts**
   - Can be removed (synthesizer agent no longer used)

## Other Files

### ❌ Can Be Removed

Old architecture files:

1. **lib/ai/agent-orchestrator.ts**
   - Purpose: Orchestrate multiple agents in V1 architecture
   - Used by: Old routing logic (replaced by Mastra workflows)
   - V2 Strategy: Workflows handle orchestration

## Documentation Files (Markdown)

### ⚠️ Keep for Historical Reference

These are documentation files that explain the migration:

- All `*.md` files in root directory
- These document the journey and can be useful for understanding decisions
- Consider moving to a `docs/archive/` folder instead of deleting

## Summary

### Safe to Remove (24 files)

**Workflows (6 files):**

- basic-search-workflow.ts
- advanced-search-workflow.ts
- comprehensive-analysis-workflow.ts
- enhanced-comprehensive-workflow.ts
- low-advance-search-workflow.ts
- high-advance-search-workflow.ts

**Agents (4 files):**

- entity-extractor-agent.ts
- synthesizer-agent.ts
- claim-extractor-agent.ts
- summarizer-agent.ts

**Utilities (6 files):**

- entity-validation.ts
- entity-merging.ts
- document-composer.ts
- workflow-entity-steps.ts
- token-budget-tracker.ts
- legal-entities.ts

**Other (2 files):**

- agent-orchestrator.ts
- scripts/test-synthesizer-agent.ts

**Tests (3 files - update, don't remove):**

- tests/integration/basic-search-workflow.test.ts
- tests/integration/advanced-search-workflow.test.ts
- tests/integration/comprehensive-analysis-workflow.test.ts

**Scripts (3 files - update, don't remove):**

- scripts/test-advanced-search-workflow.ts
- scripts/test-comprehensive-analysis-workflow.ts
- scripts/test-workflow-tool-integration.ts

### Recommendation

1. **Phase 1**: Remove workflow files (6 files) - safest
2. **Phase 2**: Remove agent files (4 files) - safe after workflow removal
3. **Phase 3**: Remove utility files (6 files) - safe after agent removal
4. **Phase 4**: Update test and script files (6 files) - update to use V2
5. **Phase 5**: Archive documentation to `docs/archive/` folder

### Before Removing

Run these checks:

```bash
# Check for any remaining imports
pnpm exec grep -r "entity-extractor-agent" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
pnpm exec grep -r "synthesizer-agent" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
pnpm exec grep -r "entity-validation" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules

# Run tests to ensure nothing breaks
pnpm test

# Run type checking
pnpm tsc --noEmit
```
