# Validation Rules and Criteria

## Overview

This document details the validation rules used to determine if an AI response is valid and meaningful. These rules ensure users only consume quota for responses that provide actual value.

## Core Validation Principles

1. **User Value**: Response must provide meaningful information to the user
2. **Completeness**: Response must be complete, not just tool calls
3. **Substance**: Response must contain sufficient content (not just whitespace)
4. **Clarity**: Response must include explanatory text, not just data

## Validation Rules

### Rule 1: Minimum Text Length

**Requirement**: Response must contain at least 10 characters of text content

**Rationale:**

- Filters out empty or near-empty responses
- Ensures substantive content
- 10 characters allows for short but meaningful responses (e.g., "Yes, I can help with that.")

**Implementation:**

```typescript
const totalTextLength = messages
  .filter((m) => m.role === "assistant")
  .reduce((sum, m) => sum + (m.content || "").length, 0);

if (totalTextLength >= 10) {
  return { isValid: true, reason: "Sufficient text content" };
}
```

**Valid Examples:**

- "Here's the solution..." (20 chars)
- "I understand." (13 chars)
- "Let me help." (12 chars)

**Invalid Examples:**

- "" (0 chars)
- "OK" (2 chars)
- " " (3 chars whitespace)

---

### Rule 2: Tool Outputs with Follow-up Text

**Requirement**: If response contains tool outputs, it must also include at least 10 characters of follow-up explanatory text

**Rationale:**

- Tool outputs alone don't explain what was done
- Users need context and explanation
- Ensures AI provides interpretation, not just raw data

**Implementation:**

```typescript
const hasToolOutputs = messages.some(
  (m) =>
    m.role === "assistant" &&
    m.toolInvocations?.some((t) => t.state === "result")
);

if (hasToolOutputs) {
  // Find text after tool outputs
  const textAfterTools = getTextAfterLastToolOutput(messages);

  if (textAfterTools.length >= 10) {
    return { isValid: true, reason: "Tool outputs with explanation" };
  } else {
    return { isValid: false, reason: "Tool calls without text" };
  }
}
```

**Valid Example:**

```
[Tool: createDocument]
Output: Document created with ID doc-123

I've created a new document for you with the content you requested.
You can now edit it using the editor on the right.
```

**Invalid Example:**

```
[Tool: createDocument]
Output: Document created with ID doc-123

(no follow-up text)
```

---

### Rule 3: No Tool-Calls-Only Responses

**Requirement**: Response cannot consist solely of tool calls without any text

**Rationale:**

- This is the primary issue with Cerebras model
- Tool calls without explanation provide no user value
- Users need to understand what the AI is doing

**Implementation:**

```typescript
const hasToolCalls = messages.some(
  (m) => m.role === "assistant" && m.toolInvocations?.length > 0
);

const hasText = messages.some(
  (m) => m.role === "assistant" && (m.content || "").trim().length > 0
);

if (hasToolCalls && !hasText) {
  return {
    isValid: false,
    reason: "Tool calls without text",
    metrics: { toolCallsWithoutText: toolCallCount },
  };
}
```

**Invalid Example:**

```
Assistant: [calls createDocument tool]
Assistant: [calls updateDocument tool]
(no text content)
```

**Valid Example:**

```
Assistant: I'll create a document for you.
Assistant: [calls createDocument tool]
Assistant: Done! I've created the document.
```

---

### Rule 4: No Empty Messages

**Requirement**: Response cannot consist entirely of empty assistant messages

**Rationale:**

- Empty messages provide no value
- Indicates model failure or error
- Should trigger retry

**Implementation:**

```typescript
const assistantMessages = messages.filter((m) => m.role === "assistant");
const emptyMessages = assistantMessages.filter(
  (m) => !m.content && (!m.toolInvocations || m.toolInvocations.length === 0)
);

if (emptyMessages.length === assistantMessages.length) {
  return {
    isValid: false,
    reason: "Empty response",
    metrics: { emptyMessages: emptyMessages.length },
  };
}
```

---

### Rule 5: No Whitespace-Only Content

**Requirement**: Text content must contain non-whitespace characters

**Rationale:**

- Whitespace-only responses provide no information
- Filters out formatting-only responses
- Ensures actual content exists

**Implementation:**

```typescript
const textContent = messages
  .filter((m) => m.role === "assistant")
  .map((m) => m.content || "")
  .join("");

const nonWhitespaceContent = textContent.replace(/\s/g, "");

if (nonWhitespaceContent.length === 0) {
  return {
    isValid: false,
    reason: "Whitespace-only content",
  };
}
```

**Invalid Examples:**

- " " (spaces)
- "\n\n\n" (newlines)
- "\t\t" (tabs)

---

## Validation Flow

```
Input: messages[]
    ↓
Count assistant messages
    ↓
Calculate total text length
    ↓
Check for tool outputs
    ↓
Check for tool calls
    ↓
Apply validation rules
    ↓
Return ValidationResult
```

## Validation Result Structure

```typescript
interface ValidationResult {
  isValid: boolean; // Overall validation result
  reason: string; // Human-readable reason
  metrics: {
    assistantMessageCount: number; // Total assistant messages
    totalTextLength: number; // Total text characters
    hasToolOutputs: boolean; // Has completed tool calls
    emptyMessages: number; // Count of empty messages
    toolCallsWithoutText: number; // Tool calls lacking explanation
  };
}
```

## Edge Cases

### Case 1: Multiple Assistant Messages

**Scenario**: Response contains multiple assistant messages

**Handling**: Combine all assistant message content for validation

**Example:**

```
Assistant: "Let me help"
Assistant: "with that."
Total: 21 characters → Valid
```

---

### Case 2: Mixed Content

**Scenario**: Response has both text and tool calls

**Handling**: Validate that text comes after tool outputs

**Example:**

```
Assistant: "I'll create a document"  ← Text before tools
Assistant: [createDocument tool]
Assistant: "Done!"  ← Text after tools
Result: Valid (has both)
```

---

### Case 3: Streaming Incomplete

**Scenario**: Stream interrupted mid-response

**Handling**: Validate whatever content was received

**Example:**

```
Assistant: "Let me he"  ← Incomplete
Result: Invalid (< 10 chars)
```

---

### Case 4: Special Characters

**Scenario**: Response contains only special characters

**Handling**: Count as valid characters if non-whitespace

**Example:**

```
Assistant: "!@#$%^&*()"  ← 10 special chars
Result: Valid (meets 10 char minimum)
```

---

### Case 5: Code Blocks

**Scenario**: Response is primarily code

**Handling**: Code characters count toward text length

**Example:**

````
Assistant: "```\nconst x = 1;\n```"
Result: Valid (code is valid content)
````

---

## Validation Metrics

### Metrics Collected

For each validation, collect:

1. **assistantMessageCount**: Number of assistant messages
2. **totalTextLength**: Total characters in text content
3. **hasToolOutputs**: Boolean indicating tool usage
4. **emptyMessages**: Count of messages with no content
5. **toolCallsWithoutText**: Count of unexplained tool calls

### Metrics Usage

**Debugging:**

- Understand why validation failed
- Identify patterns in failures
- Tune validation rules

**Monitoring:**

- Track validation failure reasons
- Identify problematic models
- Measure validation effectiveness

**Optimization:**

- Adjust thresholds based on data
- Refine rules for edge cases
- Improve user experience

---

## Validation Examples

### Example 1: Valid Simple Response

**Input:**

```typescript
[
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi! How can I help you today?" },
];
```

**Validation:**

- Text length: 30 characters ✓
- No tool calls
- Not empty ✓

**Result:** Valid

---

### Example 2: Invalid Empty Response

**Input:**

```typescript
[
  { role: "user", content: "Hello" },
  { role: "assistant", content: "" },
];
```

**Validation:**

- Text length: 0 characters ✗
- Empty message ✗

**Result:** Invalid (reason: "Empty response")

---

### Example 3: Invalid Tool-Only Response

**Input:**

```typescript
[
  { role: "user", content: "Create a document" },
  {
    role: "assistant",
    content: "",
    toolInvocations: [{ toolName: "createDocument", state: "result" }],
  },
];
```

**Validation:**

- Has tool calls ✓
- Text length: 0 characters ✗
- Tool calls without text ✗

**Result:** Invalid (reason: "Tool calls without text")

---

### Example 4: Valid Tool Response with Explanation

**Input:**

```typescript
[
  { role: "user", content: "Create a document" },
  {
    role: "assistant",
    content: "I'll create that document for you.",
    toolInvocations: [{ toolName: "createDocument", state: "call" }],
  },
  {
    role: "assistant",
    content: "Done! I've created the document.",
    toolInvocations: [{ toolName: "createDocument", state: "result" }],
  },
];
```

**Validation:**

- Has tool outputs ✓
- Text after tools: 31 characters ✓
- Has explanation ✓

**Result:** Valid

---

### Example 5: Invalid Short Response

**Input:**

```typescript
[
  { role: "user", content: "Can you help?" },
  { role: "assistant", content: "Yes" },
];
```

**Validation:**

- Text length: 3 characters ✗
- Below 10 character minimum ✗

**Result:** Invalid (reason: "Insufficient text (3 chars)")

---

## Tuning Validation Rules

### Adjusting Text Length Threshold

**Current**: 10 characters

**Considerations:**

- Too low: Allows trivial responses
- Too high: Rejects valid short responses
- Sweet spot: 10-15 characters

**How to adjust:**

```typescript
// In lib/utils/validate-response.ts
const MIN_TEXT_LENGTH = parseInt(
  process.env.MIN_VALIDATION_TEXT_LENGTH || "10",
  10
);
```

**Environment variable:**

```bash
MIN_VALIDATION_TEXT_LENGTH=15  # Increase to 15 chars
```

---

### Enabling/Disabling Rules

**Add rule toggles:**

```typescript
const RULES = {
  minTextLength: process.env.VALIDATE_MIN_TEXT === "true",
  toolExplanation: process.env.VALIDATE_TOOL_EXPLANATION === "true",
  noToolOnly: process.env.VALIDATE_NO_TOOL_ONLY === "true",
  noEmpty: process.env.VALIDATE_NO_EMPTY === "true",
  noWhitespace: process.env.VALIDATE_NO_WHITESPACE === "true",
};
```

**Environment variables:**

```bash
VALIDATE_MIN_TEXT=true
VALIDATE_TOOL_EXPLANATION=true
VALIDATE_NO_TOOL_ONLY=true
VALIDATE_NO_EMPTY=true
VALIDATE_NO_WHITESPACE=true
```

---

### Adding Custom Rules

**Example: Require greeting in first response**

```typescript
function validateGreeting(messages: any[]): ValidationResult {
  const firstAssistant = messages.find((m) => m.role === "assistant");
  const greetings = ["hello", "hi", "hey", "greetings"];

  const hasGreeting = greetings.some((g) =>
    firstAssistant?.content?.toLowerCase().includes(g)
  );

  if (!hasGreeting) {
    return {
      isValid: false,
      reason: "Missing greeting",
      metrics: {
        /* ... */
      },
    };
  }

  return {
    isValid: true,
    reason: "Has greeting",
    metrics: {
      /* ... */
    },
  };
}
```

---

## Testing Validation Rules

### Unit Tests

Test each rule independently:

```typescript
describe("Validation Rules", () => {
  test("Rule 1: Minimum text length", () => {
    const valid = validateResponseEnhanced([
      { role: "assistant", content: "Hello there!" },
    ]);
    expect(valid.isValid).toBe(true);

    const invalid = validateResponseEnhanced([
      { role: "assistant", content: "Hi" },
    ]);
    expect(invalid.isValid).toBe(false);
  });

  test("Rule 2: Tool outputs with text", () => {
    // Test implementation
  });

  // ... more tests
});
```

### Integration Tests

Test validation in full retry flow:

```typescript
test("Invalid response triggers retry", async () => {
  // Mock AI to return empty response
  mockAI.mockReturnValue({ messages: [{ role: "assistant", content: "" }] });

  const result = await retryManager.executeWithRetry(/* ... */);

  expect(result.attemptsUsed).toBeGreaterThan(1);
});
```

---

## Validation Best Practices

### 1. Be Lenient

- Allow short but meaningful responses
- Don't over-validate formatting
- Focus on user value, not perfection

### 2. Provide Clear Reasons

- Validation failures should have clear reasons
- Include metrics for debugging
- Help developers understand issues

### 3. Monitor and Adjust

- Track validation failure rates
- Analyze failure reasons
- Adjust rules based on data

### 4. Document Changes

- Log all rule changes
- Document rationale
- Track impact on metrics

### 5. Test Thoroughly

- Unit test each rule
- Integration test full flow
- Test edge cases

---

## Troubleshooting

### Issue: Too Many False Positives

**Symptom**: Valid responses marked invalid

**Investigation:**

1. Review validation failure reasons
2. Check metrics for patterns
3. Examine specific examples

**Resolution:**

- Lower text length threshold
- Adjust tool explanation rules
- Add exceptions for specific cases

---

### Issue: Too Many False Negatives

**Symptom**: Invalid responses marked valid

**Investigation:**

1. Review responses that should have failed
2. Identify missing validation rules
3. Check for edge cases

**Resolution:**

- Increase text length threshold
- Add stricter rules
- Improve tool validation

---

### Issue: Inconsistent Validation

**Symptom**: Same response validated differently

**Investigation:**

1. Check for race conditions
2. Review validation logic
3. Verify message ordering

**Resolution:**

- Ensure deterministic validation
- Fix race conditions
- Add logging for debugging

---

## Future Enhancements

### 1. ML-Based Validation

Use machine learning to assess response quality:

```typescript
async function validateWithML(messages: any[]): Promise<ValidationResult> {
  const score = await mlModel.scoreResponse(messages);
  return {
    isValid: score > 0.7,
    reason: `Quality score: ${score}`,
    metrics: { qualityScore: score },
  };
}
```

### 2. Context-Aware Validation

Validate based on user query:

```typescript
function validateWithContext(
  messages: any[],
  userQuery: string
): ValidationResult {
  // Check if response addresses the query
  const relevance = calculateRelevance(messages, userQuery);
  return {
    isValid: relevance > 0.5,
    reason: `Relevance: ${relevance}`,
    metrics: { relevance },
  };
}
```

### 3. User Feedback Integration

Learn from user feedback:

```typescript
function updateValidationRules(feedback: UserFeedback) {
  if (feedback.wasHelpful === false && validation.isValid) {
    // Response passed validation but user found unhelpful
    // Adjust rules to catch similar cases
  }
}
```

---

## Additional Resources

- [API Reference](./API_REFERENCE.md) - Validation API details
- [Monitoring Guide](./MONITORING_GUIDE.md) - Tracking validation metrics
- [Requirements](./requirements.md) - Validation requirements
- [Design](./design.md) - Validation design decisions
