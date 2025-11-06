# createDocument Tool - Quick Activation Guide

## What Changed?

All agents and prompts now have **expanded, explicit triggers** to recognize document creation requests and call the `createDocument` tool immediately.

## Document Creation Trigger Keywords

Your agents now recognize and will call `createDocument` when users say:

### Primary Verbs

- **"Create"** → "Create a document about..."
- **"Write"** → "Write a summary/essay/report/analysis/brief..."
- **"Draft"** → "Draft a contract/agreement/letter/proposal..."
- **"Generate"** → "Generate a guide/handbook/outline/template..."
- **"Compose"** → "Compose a letter/email/proposal..."
- **"Produce"** → "Produce a report/analysis/framework..."

### Natural Language Patterns

- "I need a [type]..."
- "Can you [create/write/draft/make] me a [type]?"
- "Make a [type of document]..."
- Any request for substantial written content (>200 words)

## Examples That Will Work

### ✅ Will Now Call createDocument

```
"Create a document about constitutional rights in Zimbabwe"
→ Creates document automatically with title "Constitutional Rights in Zimbabwe"

"Write an employment contract template"
→ Creates document titled "Employment Contract Template"

"Draft a memorandum of understanding"
→ Creates document titled "Memorandum of Understanding"

"I need a guide on business formation in Zimbabwe"
→ Creates document titled "Business Formation Guide"

"Generate a compliance checklist for NGOs"
→ Creates document titled "NGO Compliance Checklist"

"Can you write me a legal opinion on property seizure?"
→ Creates document titled "Legal Opinion: Property Seizure"
```

### ❌ Will NOT Call createDocument (and shouldn't)

```
"Explain contract law"
→ Provides explanation in chat

"What are the requirements for a valid marriage?"
→ Provides information in chat

"Tell me about the Companies Act"
→ Provides information in chat
```

## How It Works Behind the Scenes

### For Research-Based Requests

```
User: "Create a document about employment law in Zimbabwe"
↓
Agent: Search for current employment law information
↓
Agent: Call createDocument({
  title: "Employment Law in Zimbabwe",
  kind: "text"
})
↓
Tool: Generates full document content
↓
User: Sees document in artifact panel
```

### For Direct Requests

```
User: "Write a contract for a service agreement"
↓
Agent: Call createDocument({
  title: "Service Agreement Contract",
  kind: "text"
})
↓
Tool: Generates template
↓
User: Sees contract in artifact panel
```

## Monitoring Tool Calls

The route handler now logs every `createDocument` invocation. Look for these log messages:

```
[Mastra] 📄 Document creation tool 'createDocument' was successfully invoked
[Mastra] 📝 Document created: "Employment Contract" (kind: text)
[Mastra] ✅ Document creation result: ID=abc123, Title="Employment Contract"
[Mastra] 🔨 Tools invoked in this interaction: createDocument, tavilySearch
```

## Where Are the Changes?

| Component              | What Changed                                          |
| ---------------------- | ----------------------------------------------------- |
| **Tool Description**   | Now explicitly says "REQUIRED" and "IMMEDIATELY"      |
| **Agent Instructions** | Now include comprehensive trigger lists with examples |
| **System Prompts**     | Now include document creation workflows and patterns  |
| **Logging**            | Now tracks and reports createDocument invocations     |

## What to Test

Try these requests to verify the improvements:

1. "Create a document about inheritance law"
2. "Write a memorandum on employment termination"
3. "Draft an independent contractor agreement"
4. "Generate a legal analysis of the Constitution"
5. "Compose a letter of demand template"

Expected result for all: Document created and displayed in artifact panel

## If It Still Doesn't Work

1. Check the logs for `[Mastra] 📄 Document creation tool` messages
2. Verify the user is using clear document creation keywords
3. If research is needed, ensure search runs before createDocument
4. Check that document type is unambiguous (e.g., "document", "contract", "guide", "template")

## Document Types Supported

- `text` - Markdown documents, memoranda, analyses, guides
- `code` - Code files, templates, scripts
- `sheet` - Spreadsheets, data tables
- `image` - Visual content (requires image generation backend)

## Key Principle

**When users ask to CREATE something → Call createDocument IMMEDIATELY**
**When users ask to EXPLAIN something → Provide answer in chat**

---

_Last Updated: November 6, 2025_
_Implementation: All agents and prompts enhanced_
_Monitoring: Full logging enabled_
