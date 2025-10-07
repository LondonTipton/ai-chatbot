# Document Artifact Content Separation - Diagnosis and Fix

## Problem

When creating document artifacts (like legal documents), unnecessary content was appearing in the artifact:

- Introductory phrases ("Here's a sample...", "Okay, here's...")
- Disclaimers and warnings
- Explanatory notes
- Instructions about customization

This content should appear in the chat message, not in the document artifact itself.

## Root Cause

The issue had two components:

### 1. Architecture Understanding

The system uses a two-step process for document creation:

- **Step 1**: Main model responds in chat and decides to call `createDocument` tool
- **Step 2**: A separate model call generates the actual document content

### 2. Missing Instructions

The separate model call in `artifacts/text/server.ts` had a simple system prompt that didn't include instructions about content separation:

```typescript
system: "Write about the given topic. Markdown is supported. Use headings wherever appropriate.";
```

## Fixes Applied

### Fix 1: Updated Text Document Handler (`artifacts/text/server.ts`)

Added explicit instructions to the document generation system prompt:

- Write ONLY the document content itself
- Do NOT include introductory phrases, disclaimers, or meta-commentary
- Output should be clean, professional, ready-to-use content

### Fix 2: Enhanced Artifacts Prompt (`lib/ai/prompts.ts`)

Added comprehensive section explaining:

- What goes in chat messages vs. document artifacts
- Correct workflow for using createDocument tool
- Examples of correct vs. incorrect usage
- Clear separation of concerns

### Fix 3: Updated Regular Prompt (`lib/ai/prompts.ts`)

Added professional use disclaimer and document drafting guidelines to ensure the model:

- Drafts documents confidently without excessive disclaimers
- Trusts the professional user's judgment
- Provides clean document content

### Fix 4: Updated Document Update Prompts (`lib/ai/prompts.ts`)

**CRITICAL FIX for editing artifacts:**
Updated `updateDocumentPrompt` function to include explicit instructions for all artifact types:

- For text: Output ONLY the updated document content, no explanatory notes
- For code: Output ONLY the updated code, no commentary
- For sheets: Output ONLY the updated CSV data, no explanations
- Added "CRITICAL" instructions to prevent including chat messages in artifacts during edits

This fix addresses the issue where editing artifacts would include conversational text like "Here's the updated version..." in the document itself.

## Expected Behavior After Fix

### Chat Message Should Contain:

- Brief context ("I'll draft a Motion for Appeal for you...")
- Disclaimers ("Please note this is a template...")
- Instructions ("You should consult with a qualified attorney...")
- Guidance about customization

### Document Artifact Should Contain:

- ONLY the actual document content
- Proper legal formatting and structure
- Clean, professional text ready to use/edit
- No meta-commentary or explanations

## Testing Recommendations

Test with various document types:

1. Legal documents (motions, pleadings, contracts)
2. Business documents (letters, memos)
3. Technical documents (specifications, reports)

Verify that:

- Chat messages contain appropriate context and disclaimers
- Document artifacts contain only clean document content
- No duplication between chat and artifact
- Documents are properly formatted and professional

## Notes

If the model still includes unwanted content in artifacts, it may be due to:

1. Model limitations in following tool-use instructions
2. Need for more specific examples in the prompts
3. Model training data patterns overriding instructions

Consider testing with different models if issues persist.
