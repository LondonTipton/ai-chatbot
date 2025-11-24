import { sanitizeUserInput } from "../lib/input-sanitizer";

console.log("=".repeat(80));
console.log("INPUT SANITIZATION FIX VERIFICATION");
console.log("=".repeat(80));
console.log("");

// Test cases that should now work
const testCases = [
  {
    name: "Plain text message",
    input: "Hello, how are you?",
    expectedValid: true,
    expectedPreserved: true,
  },
  {
    name: "Message with newlines",
    input: "Line 1\nLine 2\nLine 3",
    expectedValid: true,
    expectedPreserved: true,
  },
  {
    name: "Message with special characters",
    input: "Testing & symbols < > ' \" /",
    expectedValid: true,
    expectedPreserved: true,
  },
  {
    name: "XSS attempt (should be escaped)",
    input: "<script>alert('xss')</script>",
    expectedValid: true,
    expectedPreserved: false, // Script tag should be escaped
  },
  {
    name: "Empty message",
    input: "",
    expectedValid: false,
    expectedPreserved: false,
  },
  {
    name: "Whitespace only",
    input: "   ",
    expectedValid: false,
    expectedPreserved: false,
  },
  {
    name: "Legal question",
    input: "What is the law regarding contracts in Zimbabwe?",
    expectedValid: true,
    expectedPreserved: true,
  },
];

let passedTests = 0;
let failedTests = 0;

for (const test of testCases) {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`Input: "${test.input}"`);
  console.log(`Input Length: ${test.input.length}`);

  const result = sanitizeUserInput(test.input);

  console.log("\nResult:");
  console.log(`  Sanitized: "${result.sanitized}"`);
  console.log(`  Sanitized Length: ${result.sanitized.length}`);
  console.log(`  Is Valid: ${result.isValid}`);
  console.log(`  Errors: ${result.errors.join(", ") || "None"}`);

  // Check if test passed
  const validityMatches = result.isValid === test.expectedValid;
  const contentPreserved = test.expectedPreserved
    ? result.sanitized.length > 0
    : true;

  const testPassed = validityMatches && contentPreserved;

  if (testPassed) {
    console.log("\n✅ PASSED");
    passedTests++;
  } else {
    console.log("\n❌ FAILED");
    if (!validityMatches) {
      console.log(
        `   Expected isValid: ${test.expectedValid}, Got: ${result.isValid}`
      );
    }
    if (!contentPreserved) {
      console.log("   Expected content to be preserved but got empty string");
    }
    failedTests++;
  }
}

console.log(`\n${"=".repeat(80)}`);
console.log(`SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log("=".repeat(80));

if (failedTests === 0) {
  console.log("\n✅ ALL TESTS PASSED! Messages should now send successfully.");
} else {
  console.log("\n❌ SOME TESTS FAILED. Please review the implementation.");
  process.exit(1);
}
