# createDocument Tool Improvements - Implementation Summary

## Overview

This document outlines all improvements made to increase the chances of the `createDocument` tool being called by agents in the codebase. The enhancements focus on clearer instructions, expanded trigger keywords, and better logging.

---

## 1. ✅ Enhanced Tool Description

**File:** `mastra/tools/create-document.ts`

### Change

Updated the tool's description from generic to action-oriented and urgent:

```typescript
// BEFORE:
"Create a document for writing or content creation activities. This tool will generate the contents
of the document based on the title and kind. Supports text documents, code files, spreadsheets, and images."

// AFTER:
"REQUIRED: Call this tool IMMEDIATELY when users ask to create, write, draft, generate, compose,
or produce any document. This tool generates full content automatically based on title and kind.
NEVER write document content in chat responses. Supports text documents, code files, spreadsheets, and images."
```

### Impact

- Makes tool purpose explicit and mandatory
- Sets clear expectation that agents must NOT write content directly
- Signals urgency with "REQUIRED" and "IMMEDIATELY"

---

## 2. ✅ Expanded Trigger Keywords in Chat Agent

**File:** `mastra/agents/chat-agent.ts`

### Enhanced Document Tools Section

Added comprehensive trigger list with examples:

```typescript
DOCUMENT CREATION TRIGGERS - Call createDocument immediately on these keywords:
• "Create a document" or "Create a [type] document"
• "Write a [type]" (essay, summary, report, memo, brief, analysis, etc.)
• "Draft a [type]" (contract, agreement, letter, proposal, etc.)
• "Generate a [type]" (outline, guide, handbook, template, etc.)
• "Compose a [type]" (letter, email, proposal, document, etc.)
• "Produce a [type]" (report, analysis, document, etc.)
• "I need a [document type]" (when document type is clear)
• "Can you [write/create/draft] me a [type]"
• "Make a [type of document]"
• Any request for substantial written content (>200 words)
```

### Impact

- Agents now have explicit recognition of document creation patterns
- Multiple variations of user requests are handled
- Clear examples improve decision-making

---

## 3. ✅ Strengthened Medium Research Agent Instructions

**File:** `mastra/agents/medium-research-agent-factory.ts`

### Changes

Added detailed document creation workflow with triggers:

- **Explicit Trigger Recognition:** Clear list of document creation keywords
- **Workflow Sequencing:** Search → createDocument → Response
- **Example Approach:** "Create a document about employment law" workflow
- **Maximum Tool Call Budget:** Clear guidance on 4-tool limit with createDocument priority

### Impact

- Research agents explicitly prioritize document creation requests
- Clear workflow prevents confusion about when to use search vs. createDocument
- Examples show correct vs. incorrect approaches

---

## 4. ✅ Enhanced Legal Agent Instructions

**File:** `mastra/agents/legal-agent-factory.ts`

### Enhancements

Complete restructuring with clear sections:

```
📝 DOCUMENT CREATION - CRITICAL TRIGGERS
═══════════════════════════════════════════════════════════════════════════════

CALL createDocument IMMEDIATELY when user requests ANY of:
• "Create a document..."
• "Write a [type]..."
• "Draft a [type]..."
• "Generate a [type]..."
• etc.

DOCUMENT CREATION WORKFLOW:
1. If research needed: Use tavilySearch/tavilyExtract first
2. THEN immediately: Call createDocument
3. DO NOT write document content in response
4. DO provide brief guidance after creation
```

### Impact

- Clear visual hierarchy makes instructions scannable
- Explicit examples of correct vs. wrong approaches
- Workflow is sequential and unambiguous

---

## 5. ✅ Comprehensive Prompt Updates

**File:** `lib/ai/prompts.ts`

### Enhanced Sections

#### Document Creation Triggers

Expanded trigger list in `artifactsPrompt`:

```typescript
**Document Creation Triggers - CALL createDocument IMMEDIATELY on:**
- "Create a document" or "Create a [type] document"
- "Write a [type]..." (essay, report, summary, analysis, brief, memo, guide, handbook, etc.)
- "Draft a [type]..." (contract, agreement, letter, proposal, deed, covenant, etc.)
- "Generate a [type]..." (outline, template, checklist, framework, etc.)
- "Compose [a/an] [type]..." (letter, email, proposal, document, etc.)
- "Produce [a/an] [type]..." (report, analysis, framework, document, etc.)
- "I need [a/an] [type]..." (when document type is clear)
- "Can you [write/create/draft/make] me a [type]..."
- Any request for substantial written content (>200 words)
```

#### Enhanced Document Creation Workflow

Added detailed workflow examples:

```typescript
4. **DOCUMENT CREATION WORKFLOW** - When user asks to CREATE a document:
   a) Recognize trigger keywords: "create", "write", "draft", "generate", "compose", "produce"
   b) If you need information: Search FIRST using tavily tools
   c) Then IMMEDIATELY call createDocument with descriptive title
   d) DO NOT explain in chat what will be in the document
   e) Let the createDocument tool generate the content
   f) After document is created, provide brief guidance (1-2 sentences)

DOCUMENT CREATION TRIGGER EXAMPLES:
• "Create a document about [topic]" → Call createDocument immediately
• "Write a [type] about [topic]" → Call createDocument immediately
• "Draft a [type] for [purpose]" → Call createDocument immediately
• "Generate [type] for [context]" → Call createDocument immediately
• "Can you write me a [type]?" → Call createDocument immediately
• "I need a [type] about [topic]" → Call createDocument immediately

DIFFERENT REQUEST TYPES (with correct responses):
User: "Create a contract for employment"
→ Call createDocument({ title: "Employment Contract", kind: "text" })

User: "Draft a memo about policy changes"
→ Call createDocument({ title: "Policy Changes Memo", kind: "text" })

User: "Write a research paper on constitutional law"
→ tavilySearch → createDocument({ title: "Constitutional Law Research", kind: "text" })
```

### Impact

- Prompts now include variety of document request patterns
- Different request types have explicit responses
- Clear examples reduce ambiguity

---

## 6. ✅ Enhanced Logging in Route Handler

**File:** `app/(chat)/api/chat/route.ts`

### Added Logging

Comprehensive detection and logging of `createDocument` tool invocations:

```typescript
// Log createDocument tool invocations
const hasCreateDocumentCalls = assistantMessages.some((msg: any) =>
  msg.parts?.some(
    (part: any) =>
      part.type === "tool-call" && part.toolName === "createDocument"
  )
);

if (hasCreateDocumentCalls) {
  logger.log(
    "[Mastra] 📄 Document creation tool 'createDocument' was successfully invoked"
  );

  // Extract createDocument tool results to log document details
  assistantMessages.forEach((msg: any) => {
    msg.parts?.forEach((part: any) => {
      if (part.type === "tool-call" && part.toolName === "createDocument") {
        logger.log(
          `[Mastra] 📝 Document created: "${part.args?.title}" (kind: ${part.args?.kind})`
        );
      }
      if (part.type === "tool-result" && part.toolName === "createDocument") {
        try {
          const result =
            typeof part.content === "string"
              ? JSON.parse(part.content)
              : part.content;
          logger.log(
            `[Mastra] ✅ Document creation result: ID=${result.id}, Title="${result.title}"`
          );
        } catch (_) {
          logger.log("[Mastra] ✅ Document creation completed successfully");
        }
      }
    });
  });
}

// Log all tool calls for analysis
const allToolCalls = assistantMessages.flatMap(
  (msg: any) =>
    msg.parts
      ?.filter((part: any) => part.type === "tool-call")
      .map((part: any) => part.toolName) || []
);
if (allToolCalls.length > 0) {
  logger.log(
    `[Mastra] 🔨 Tools invoked in this interaction: ${allToolCalls.join(", ")}`
  );
}
```

### Impact

- Real-time visibility into createDocument invocations
- Detailed logging of document titles and kinds
- All tool invocations tracked for analysis
- Can identify patterns of tool usage

---

## Testing Recommendations

### Manual Testing Scenarios

Test the following user requests to verify createDocument invocations:

1. **Basic Creation:** "Create a document about contract law"
2. **Varied Verbs:**
   - "Write a summary of employment termination procedures"
   - "Draft a letter of demand for unpaid rent"
   - "Generate a legal memorandum on property rights"
   - "Compose an employment contract template"
3. **Research + Creation:** "Create a document with latest information about inheritance law"
4. **Edge Cases:**
   - "I need a guide on business formation"
   - "Can you write me an analysis of constitutional law?"
   - "Make a template for a settlement agreement"

### Monitoring

Check logs for patterns:

```
[Mastra] 📄 Document creation tool 'createDocument' was successfully invoked
[Mastra] 📝 Document created: "[Title]" (kind: [type])
[Mastra] ✅ Document creation result: ID=[id], Title="[title]"
[Mastra] 🔨 Tools invoked in this interaction: [tools...]
```

---

## Improvement Areas Summary

| Component              | Improvement                                  | Files Modified                                                                              |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Tool Description**   | Made explicit and urgent                     | `mastra/tools/create-document.ts`                                                           |
| **Agent Instructions** | Expanded trigger keywords and workflows      | `mastra/agents/chat-agent.ts`, `medium-research-agent-factory.ts`, `legal-agent-factory.ts` |
| **System Prompts**     | Added comprehensive examples and patterns    | `lib/ai/prompts.ts`                                                                         |
| **Logging**            | Added real-time tracking of tool invocations | `app/(chat)/api/chat/route.ts`                                                              |

---

## Expected Outcomes

With these improvements, you should see:

1. **Increased Recognition:** Agents recognize more document creation patterns
2. **More Consistent Invocations:** clearer instructions lead to better decisions
3. **Better Visibility:** logging shows exactly when and why tool is called
4. **Faster Iteration:** logs help identify remaining edge cases quickly

---

## Next Steps (Optional)

If further improvements are needed:

1. **A/B Testing:** Compare invocation rates before/after changes
2. **Pattern Analysis:** Review logs to identify missed patterns
3. **Fine-tuning:** Add more specific examples based on patterns
4. **User Feedback:** Collect examples of requests that weren't recognized
5. **Complexity Detection:** Integrate document detection into `detectQueryComplexity`

---

## Files Modified Summary

```
✅ mastra/tools/create-document.ts
✅ mastra/agents/chat-agent.ts
✅ mastra/agents/medium-research-agent-factory.ts
✅ mastra/agents/legal-agent-factory.ts
✅ lib/ai/prompts.ts
✅ app/(chat)/api/chat/route.ts
```

Total: 6 files enhanced
Total Changes: 5 major improvements across 3 areas (descriptions, instructions, prompts, logging)
