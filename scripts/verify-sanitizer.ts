import fs from "fs";
import { sanitizeFileName, sanitizeUserInput } from "../lib/input-sanitizer";

console.log("Running Sanitizer Verification...");

// Test 1: Basic HTML sanitization
const input1 = "Hello <script>alert('xss')</script> World";
const result1 = sanitizeUserInput(input1);
console.log(`Input: "${input1}"`);
console.log(`Output: "${result1.sanitized}"`);
console.log(`Expected: "Hello  World"`);
console.log(`Match: ${result1.sanitized === "Hello  World"}`);
console.log(`Valid: ${result1.isValid}`);

if (result1.sanitized === "Hello  World" && result1.isValid) {
  console.log("✅ HTML Sanitization passed");
} else {
  console.log("⚠️ HTML Sanitization mismatch");
}

// Test 2: Filename sanitization
const input2 = "../../etc/passwd";
const result2 = sanitizeFileName(input2);
console.log(`Input: "${input2}"`);
console.log(`Output: "${result2.sanitized}"`);

if (result2.sanitized === "etcpasswd") {
  console.log("✅ Filename Sanitization passed");
} else {
  console.log("❌ Filename Sanitization failed");
}

const results = {
  htmlSanitization: {
    input: input1,
    output: result1.sanitized,
    passed: result1.sanitized === "Hello  World" && result1.isValid,
  },
  filenameSanitization: {
    input: input2,
    output: result2.sanitized,
    passed: result2.sanitized === "etcpasswd",
  },
};

fs.writeFileSync("verification_results.json", JSON.stringify(results, null, 2));
console.log("Results written to verification_results.json");
