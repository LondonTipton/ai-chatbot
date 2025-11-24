import { sanitizeUserInput } from "../lib/input-sanitizer";

console.log("Testing 'hi' message...\n");

const input = "hi";
const result = sanitizeUserInput(input);

console.log("Input:", JSON.stringify(input));
console.log("Output:", JSON.stringify(result.sanitized));
console.log("Is Valid:", result.isValid);
console.log("Errors:", result.errors);
console.log("Length:", result.sanitized.length);
console.log(
  "Char codes:",
  [...result.sanitized].map((c) => c.charCodeAt(0))
);

// Test what the schema would see
const testMessage = {
  type: "text",
  text: result.sanitized,
};

console.log("\nMessage object:", JSON.stringify(testMessage, null, 2));
console.log("Text length check (min 1):", testMessage.text.length >= 1);
console.log(
  "Text length check (max 10000):",
  testMessage.text.length <= 10_000
);
