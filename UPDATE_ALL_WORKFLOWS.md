# Batch Update Plan for All Workflows

## Workflows to Update

1. ✅ basic-search-workflow.ts - DONE
2. ✅ advanced-search-workflow.ts - DONE
3. ⏳ low-advance-search-workflow.ts
4. ⏳ high-advance-search-workflow.ts
5. ⏳ comprehensive-analysis-workflow.ts
6. ⏳ enhanced-comprehensive-workflow.ts

## Update Pattern

For each workflow:

1. Add imports:

```typescript
import {
  createEntityExtractionStep,
  createEntityValidationStep,
  createClaimExtractionStep,
  createDocumentCompositionStep,
} from "@/lib/utils/workflow-entity-steps";
```

2. Update workflow chain:

```typescript
// OLD
.then(searchStep)
.then(synthesizeStep)
.commit();

// NEW
.then(searchStep)
.then(createEntityExtractionStep("prefix-extract-entities"))
.then(createEntityValidationStep("prefix-validate-entities"))
.then(createClaimExtractionStep("prefix-extract-claims"))
.then(createDocumentCompositionStep("prefix-compose-document"))
.commit();
```

3. Update workflow comments to reflect new pipeline

## Workflow-Specific Notes

### low-advance-search-workflow.ts

- Similar to basic-search
- Add entity pipeline after search step

### high-advance-search-workflow.ts

- Similar to advanced-search
- Has extraction step, add entity pipeline after it

### comprehensive-analysis-workflow.ts

- Complex workflow with conditional branching
- Add entity extraction after document step
- May need custom handling for multi-phase research

### enhanced-comprehensive-workflow.ts

- Most complex workflow
- Has summarization steps
- Add entity extraction before final document step
- May need to merge entities from multiple phases

## Implementation Strategy

Due to token limits, I'll:

1. Update low and high advance search (similar to basic/advanced)
2. Create custom entity merging for comprehensive workflows
3. Test each workflow individually
