import { sanitizeUserInput } from "../lib/input-sanitizer";

// Test cases to verify the sanitization issue
const testInputs = [
  "Hello, how are you?",
  "What is the law regarding contracts in Zimbabwe?",
  "Can you help me with this?",
  "<script>alert('xss')</script>",
  "This is a test\nwith newlines\n\n\nand multiple lines",
  "",
  "   ",
  "1+1=2",
];

console.log("=".repeat(80));
console.log("SANITIZATION DEBUG TEST");
console.log("=".repeat(80));

for (const input of testInputs) {
  console.log(`\nInput: "${input}"`);
  console.log(`Length: ${input.length}`);
  
  const result = sanitizeUserInput(input);
  
  console.log(`Sanitized: "${result.sanitized}"`);
  console.log(`Length: ${result.sanitized.length}`);
  console.log(`Is Valid: ${result.isValid}`);
  console.log(`Errors: ${result.errors.join(", ")}`);
  console.log(`Truncated: ${result.truncated || false}`);
  console.log("-".repeat(80));
}
