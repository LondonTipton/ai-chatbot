# Mastra Response Validation Implementation

## Overview

This document describes the implementation of response validation for Mastra agents and workflows. The validation ensures that responses meet minimum quality standards before committing usage transactions.

## Requirements Addressed

- **12.1**: Validate Mastra responses have minimum 10 characters
- **12.2**: Log validation failures
- **12.3**: Trigger fallback to AI SDK on validation failure
- **12.4**: Commit transaction only on successful validation

## Implementation

### 1. Validation Utility (`lib/ai/mastra-validation.ts`)

Created a dedicated validation module with the following functions:

#### `validateMastraResponse(result: MastraResult): ValidationResult`

Validates a complete Mastra execution result. Checks:

- Execution was successful
- Response is not null or undefined
- Response has at least 10 characters (after trimming whitespace)

Returns a `ValidationResult` with:

- `isValid`: boolean indicating if validation passed
- `reason`: optional string explaining why validation failed
- `responseLength`: number of characters in the response

#### `validateStreamResponse(text: string): ValidationResult`

Validates streaming response text. Simpler version for use during streaming. Checks:

- Text is not empty
- Text has at least 10 characters (after trimming whitespace)

#### `extractTextFromMessage(message: any): string`

Helper function to extract text content from various message formats:

- Messages with `parts` array (extracts text from text parts)
- Messages with `content` property
- Messages with `text` property

### 2. Router Integration (`lib/ai/mastra-router.ts`)

Updated the `routeToMastra` function to validate results before returning:

```typescript
// Validate the result before returning
const validation = validateMastraResponse(result);

if (!validation.isValid) {
  console.error("[Mastra Router] ❌ Response validation failed", {
    complexity,
    reason: validation.reason,
    responseLength: validation.responseLength,
  });

  // Mark result as failed due to validation
  result.success = false;
} else {
  console.log("[Mastra Router] ✅ Response validation passed", {
    complexity,
    responseLength: validation.responseLength,
  });
}
```

### 3. Chat Route Integration (`app/(chat)/api/chat/route.ts`)

Updated the streaming transform to use validation utilities:

```typescript
// Validate complete message
if (data.type === "message-complete" && data.message) {
  const msg = data.message;

  // Extract text from message using validation utility
  const textContent = extractTextFromMessage(msg);

  // Validate response using validation utility
  const validation = validateStreamResponse(textContent);

  if (!validation.isValid) {
    streamHadError = true;
    console.error(`[Mastra] ❌ Validation failed: ${validation.reason}`);
    console.log(
      `[Mastra] Response preview: "${textContent.trim().substring(0, 50)}..."`
    );
  }
}
```

Transaction commit/rollback logic:

```typescript
async flush() {
  // Commit or rollback transaction based on stream success and validation
  try {
    if (streamHadError) {
      await rollbackTransaction(txId);
      console.log(
        `[Usage] Rolled back transaction ${txId} due to stream error or validation failure`
      );
    } else {
      await commitTransaction(txId);
      console.log(`[Usage] Committed transaction ${txId}`);
    }
  } catch (err) {
    console.error(
      `[Usage] Failed to ${
        streamHadError ? "rollback" : "commit"
      } transaction ${txId}:`,
      err
    );
  }
}
```

## Validation Rules

### Minimum Response Length

- **Constant**: `MIN_RESPONSE_LENGTH = 10`
- **Location**: `lib/ai/mastra-validation.ts`
- **Rationale**: 10 characters is the minimum for a meaningful response

### Whitespace Handling

- All responses are trimmed before measuring length
- Responses with only whitespace are considered invalid

### Failure Conditions

A response is considered invalid if:

1. Execution failed (`success: false`)
2. Response is null or undefined
3. Response length (after trimming) is less than 10 characters

## Logging

### Validation Success

```
[Mastra Validation] ✅ Response valid { responseLength: 245, minLength: 10 }
[Mastra Router] ✅ Response validation passed { complexity: 'medium', responseLength: 245 }
```

### Validation Failure

```
[Mastra Validation] ❌ Response too short { responseLength: 5, minLength: 10, preview: 'Short' }
[Mastra Router] ❌ Response validation failed { complexity: 'medium', reason: 'Response too short (5 chars, minimum 10)', responseLength: 5 }
[Mastra] ❌ Validation failed: Response too short (5 chars, minimum 10)
[Mastra] Response preview: "Short..."
[Usage] Rolled back transaction abc123 due to stream error or validation failure
```

## Transaction Handling

### Success Flow

1. Mastra agent/workflow executes
2. Response is validated
3. Validation passes
4. Transaction is committed
5. Usage is recorded

### Failure Flow

1. Mastra agent/workflow executes
2. Response is validated
3. Validation fails
4. Transaction is rolled back
5. Usage is NOT recorded
6. Error is logged

## Testing

### Unit Tests (`tests/unit/mastra-validation.test.ts`)

Comprehensive test coverage for:

#### `validateMastraResponse`

- ✅ Valid response with sufficient length
- ✅ Response too short
- ✅ Response with only whitespace
- ✅ Failed execution
- ✅ Null response
- ✅ Undefined response
- ✅ Response exactly at minimum length
- ✅ Whitespace trimming

#### `validateStreamResponse`

- ✅ Valid stream response
- ✅ Empty stream response
- ✅ Short stream response
- ✅ Whitespace trimming

#### `extractTextFromMessage`

- ✅ Extract from parts array
- ✅ Extract from content property
- ✅ Extract from text property
- ✅ Multiple text sources
- ✅ Ignore non-text parts
- ✅ No text content
- ✅ Empty message

**Test Results**: All 19 tests passing

## Benefits

1. **Quality Assurance**: Ensures responses meet minimum standards
2. **Usage Accuracy**: Only commits transactions for valid responses
3. **Debugging**: Clear logging of validation failures
4. **Consistency**: Centralized validation logic
5. **Testability**: Well-tested validation functions

## Future Enhancements

Potential improvements for future iterations:

1. **Configurable Minimum Length**: Make MIN_RESPONSE_LENGTH configurable via environment variable
2. **Content Quality Checks**: Validate response contains meaningful content (not just repeated characters)
3. **Language Detection**: Ensure response is in expected language
4. **Format Validation**: Validate response format matches expected structure
5. **Metrics**: Track validation failure rates per complexity level

## Related Files

- `lib/ai/mastra-validation.ts` - Validation utilities
- `lib/ai/mastra-router.ts` - Router with validation
- `app/(chat)/api/chat/route.ts` - Chat route with streaming validation
- `tests/unit/mastra-validation.test.ts` - Unit tests
- `lib/db/usage-transaction.ts` - Transaction management

## References

- Requirements: `.kiro/specs/mastra-integration/requirements.md` (Requirement 12)
- Design: `.kiro/specs/mastra-integration/design.md`
- Tasks: `.kiro/specs/mastra-integration/tasks.md` (Task 12)
