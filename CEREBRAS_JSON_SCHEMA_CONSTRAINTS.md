# Cerebras JSON Schema Constraints

This document outlines the JSON schema constraints when using Cerebras models with the AI SDK.

## Unsupported Zod Validators

Cerebras has strict JSON schema requirements and does NOT support the following Zod validators:

### ❌ Numeric Constraints

- `.min(n)` - Adds `minimum` field to JSON schema
- `.max(n)` - Adds `maximum` field to JSON schema
- `.positive()` - Adds `minimum: 0` to JSON schema
- `.negative()` - Adds `maximum: 0` to JSON schema
- `.nonnegative()` - Adds `minimum: 0` to JSON schema
- `.nonpositive()` - Adds `maximum: 0` to JSON schema

### ❌ String Format Validators

- `.url()` - Adds `format: "uri"` to JSON schema
- `.email()` - Adds `format: "email"` to JSON schema
- `.uuid()` - Adds `format: "uuid"` to JSON schema
- `.datetime()` - Adds `format: "date-time"` to JSON schema
- `.ip()` - Adds `format: "ip"` to JSON schema

### ❌ Array Constraints

- `.min(n)` on arrays - Adds `minItems` to JSON schema
- `.max(n)` on arrays - Adds `maxItems` to JSON schema
- `.length(n)` on arrays - Adds both `minItems` and `maxItems`

## ✅ Supported Alternatives

### For Numeric Constraints

```typescript
// ❌ Don't use
z.number().min(1).max(10);

// ✅ Use instead
z.number().describe("Number between 1 and 10");

// Then validate in execute function
const value = Math.min(Math.max(input.value, 1), 10);
```

### For String Format Validators

```typescript
// ❌ Don't use
z.string().url();

// ✅ Use instead
z.string().describe("Must be a valid URL with https://");

// Then validate in execute function
const URL_PATTERN = /^https?:\/\/.+/i;
if (!URL_PATTERN.test(input.url)) {
  throw new Error("Invalid URL format");
}
```

### For Array Constraints

```typescript
// ❌ Don't use
z.array(z.string()).min(1).max(5);

// ✅ Use instead
z.array(z.string()).describe("Array of 1-5 items");

// Then validate in execute function
const items = Array.isArray(input.items) ? input.items.slice(0, 5) : [];
if (items.length === 0) {
  throw new Error("At least one item is required");
}
```

## ✅ Supported Zod Features

These Zod features work fine with Cerebras:

- `.string()`, `.number()`, `.boolean()`
- `.enum([...])` - For fixed value sets
- `.optional()` - For optional fields
- `.default(value)` - For default values
- `.describe(text)` - For field descriptions
- `.object({...})` - For nested objects
- `.array(...)` - For arrays (without min/max)

## Error Messages

When you use unsupported validators, Cerebras will return:

```
AI_APICallError: Unsupported JSON schema fields: {'maximum', 'minimum', 'format'}
```

## Best Practices

1. **Keep schemas simple**: Use basic types and enums
2. **Validate in code**: Move constraints to execute functions
3. **Use descriptions**: Explain constraints in `.describe()` text
4. **Test thoroughly**: Verify tools work with Cerebras before deployment
5. **Document constraints**: Add validation logic comments

## Example: Complete Tool Schema

```typescript
import { tool } from "ai";
import { z } from "zod";

// Define validation patterns at top level
const URL_PATTERN = /^https?:\/\/.+/i;

export const myTool = tool({
  description: "Tool description",
  inputSchema: z.object({
    // ✅ Simple string with description
    query: z.string().describe("Search query"),

    // ✅ Enum for fixed values
    depth: z.enum(["basic", "advanced"]).optional().default("basic"),

    // ✅ Number with description (no min/max)
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum results (1-10)"),

    // ✅ Array without constraints
    urls: z
      .array(z.string())
      .describe("URLs to process (max 5, must be valid URLs)"),
  }),

  execute: async ({ query, depth, maxResults: rawMax, urls: rawUrls }) => {
    // ✅ Validate constraints in code
    const maxResults = Math.min(Math.max(rawMax, 1), 10);
    const urls = Array.isArray(rawUrls) ? rawUrls.slice(0, 5) : [];

    // ✅ Validate URL format
    const invalidUrls = urls.filter((url) => !URL_PATTERN.test(url));
    if (invalidUrls.length > 0) {
      throw new Error(`Invalid URLs: ${invalidUrls.join(", ")}`);
    }

    // Tool implementation...
  },
});
```

## Related Issues

- Cerebras API documentation: https://inference.cerebras.ai/
- AI SDK tool documentation: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
- Zod documentation: https://zod.dev/

## Updates

- **2025-01-15**: Initial documentation
- **2025-01-15**: Added format validators (url, email, etc.)
- **2025-01-15**: Added array constraints
