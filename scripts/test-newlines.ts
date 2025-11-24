import { sanitizeUserInput } from "@/lib/input-sanitizer";

console.log("Testing Newline Handling...");

const cases = [
  {
    name: "Standard Newlines",
    input: "Line 1\nLine 2\nLine 3",
    expected: "Line 1\nLine 2\nLine 3",
  },
  {
    name: "Excessive Newlines",
    input: "Line 1\n\n\n\n\nLine 2",
    expected: "Line 1\n\n\nLine 2", // Should be normalized to 3
  },
  {
    name: "Mixed HTML and Newlines",
    input: "Line 1\n<b>Bold</b>\nLine 2",
    expected: "Line 1\n<b>Bold</b>\nLine 2",
  },
  {
    name: "Newlines inside tags",
    input: "<p>Line 1\nLine 2</p>",
    expected: "<p>Line 1\nLine 2</p>",
  },
];

let failed = false;

for (const testCase of cases) {
  const result = sanitizeUserInput(testCase.input);
  console.log(`\nTest: ${testCase.name}`);
  console.log(`Input: ${JSON.stringify(testCase.input)}`);
  console.log(`Output: ${JSON.stringify(result.sanitized)}`);

  if (result.sanitized !== testCase.expected) {
    console.error("❌ FAILED");
    console.error(`Expected: ${JSON.stringify(testCase.expected)}`);
    console.error(`Actual:   ${JSON.stringify(result.sanitized)}`);
    failed = true;
  } else {
    console.log("✅ PASSED");
  }
}

if (failed) {
  process.exit(1);
}
