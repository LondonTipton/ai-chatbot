#!/usr/bin/env tsx

import { synthesizeFromToolResults } from "../lib/ai/response-synthesis";

// Test case 1: createDocument tool result
const createDocParts = [
  {
    type: "tool-result",
    toolName: "createDocument",
    toolCallId: "call-1",
    result: {
      title:
        "Comparative Cannabis Legal Status: South Africa vs Zimbabwe (2024‑2025)",
      id: "doc-123",
    },
  },
];

console.log("Test 1: createDocument tool result");
console.log("===================================");
const result1 = synthesizeFromToolResults(createDocParts);
console.log("Result:", result1);
console.log();

// Test case 2: tavilyAdvancedSearch tool result
const searchParts = [
  {
    type: "tool-result",
    toolName: "tavilyAdvancedSearch",
    toolCallId: "call-2",
    result: {
      results: [
        {
          title: "Cannabis Laws in South Africa",
          content:
            "South Africa has decriminalized personal use of cannabis...",
          url: "https://example.com/sa-cannabis",
        },
        {
          title: "Zimbabwe Cannabis Regulations",
          content: "Zimbabwe allows medical cannabis cultivation...",
          url: "https://example.com/zw-cannabis",
        },
      ],
    },
  },
];

console.log("Test 2: tavilyAdvancedSearch tool result");
console.log("=========================================");
const result2 = synthesizeFromToolResults(searchParts);
console.log("Result:", result2);
console.log();

// Test case 3: No tool results (should return null)
const emptyParts = [
  {
    type: "text",
    text: "Some text",
  },
];

console.log("Test 3: No tool results");
console.log("=======================");
const result3 = synthesizeFromToolResults(emptyParts);
console.log("Result:", result3);
console.log();

// Test case 4: Multiple tool results (should use first one)
const multipleParts = [
  {
    type: "tool-result",
    toolName: "createDocument",
    toolCallId: "call-1",
    result: {
      title: "First Document",
    },
  },
  {
    type: "tool-result",
    toolName: "updateDocument",
    toolCallId: "call-2",
    result: {
      success: true,
    },
  },
];

console.log("Test 4: Multiple tool results");
console.log("==============================");
const result4 = synthesizeFromToolResults(multipleParts);
console.log("Result:", result4);
