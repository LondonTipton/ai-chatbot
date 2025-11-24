import {
  sanitizeMarkdownOutput,
  sanitizeUserInput,
} from "../lib/input-sanitizer";
import { generateUUID } from "../lib/utils";

console.log("Running Sanitizer and UUID Tests...");

// Test UUID
const uuid = generateUUID();
console.log(`Generated UUID: ${uuid}`);
if (uuid.length !== 21) {
  // nanoid default is 21 chars
  console.error("❌ UUID length is incorrect (expected 21 for nanoid)");
  process.exit(1);
}
console.log("✅ UUID generation passed");

// Test 1: Plain text (CRITICAL - this was failing before)
console.log("\n--- Test 1: Plain Text ---");
const plainText = "Hello, how are you?";
const plainResult = sanitizeUserInput(plainText);
console.log(`Input: "${plainText}"`);
console.log(`Output: "${plainResult.sanitized}"`);
console.log(`Valid: ${plainResult.isValid}`);

if (!plainResult.isValid) {
  console.error("❌ Plain text was marked as invalid");
  console.error(`Errors: ${plainResult.errors.join(", ")}`);
  process.exit(1);
}
if (plainResult.sanitized !== plainText) {
  console.error("❌ Plain text was modified");
  console.error(`Expected: "${plainText}"`);
  console.error(`Got: "${plainResult.sanitized}"`);
  process.exit(1);
}
console.log("✅ Plain text sanitization passed");

// Test 2: Text with newlines
console.log("\n--- Test 2: Text with Newlines ---");
const textWithNewlines = "Line 1\nLine 2\nLine 3";
const newlineResult = sanitizeUserInput(textWithNewlines);
console.log(`Input: "${textWithNewlines}"`);
console.log(`Output: "${newlineResult.sanitized}"`);

if (!newlineResult.isValid) {
  console.error("❌ Text with newlines was marked as invalid");
  process.exit(1);
}
if (newlineResult.sanitized !== textWithNewlines) {
  console.error("❌ Newlines were not preserved");
  process.exit(1);
}
console.log("✅ Newline preservation passed");

// Test 3: Text with special characters
console.log("\n--- Test 3: Special Characters ---");
const specialChars = "Testing & symbols < > ' \" /";
const specialResult = sanitizeUserInput(specialChars);
console.log(`Input: "${specialChars}"`);
console.log(`Output: "${specialResult.sanitized}"`);

if (!specialResult.isValid) {
  console.error("❌ Text with special chars was marked as invalid");
  process.exit(1);
}
// Special chars should be escaped but text should be preserved
if (specialResult.sanitized.length === 0) {
  console.error("❌ Special characters caused text to be stripped");
  process.exit(1);
}
console.log("✅ Special character handling passed");

// Test 4: XSS attempt (should be blocked/escaped)
console.log("\n--- Test 4: XSS Attempt ---");
const xssAttempt = "<script>alert('xss')</script>Hello World";
const xssResult = sanitizeUserInput(xssAttempt);
console.log(`Input: "${xssAttempt}"`);
console.log(`Output: "${xssResult.sanitized}"`);

if (xssResult.sanitized.includes("<script>")) {
  console.error("❌ Script tag was not removed/escaped");
  process.exit(1);
}
// The text "Hello World" should still be present
if (!xssResult.sanitized.includes("Hello World")) {
  console.error("❌ Valid text was removed along with script tag");
  process.exit(1);
}
console.log("✅ XSS protection passed");

// Test 5: Safe HTML formatting
console.log("\n--- Test 5: Safe HTML ---");
const safeHtml = "Hello <b>World</b> and <em>everyone</em>";
const htmlResult = sanitizeUserInput(safeHtml);
console.log(`Input: "${safeHtml}"`);
console.log(`Output: "${htmlResult.sanitized}"`);

if (!htmlResult.isValid) {
  console.error("❌ Safe HTML was marked as invalid");
  process.exit(1);
}
if (!htmlResult.sanitized.includes("<b>World</b>")) {
  console.error("❌ Safe HTML tags were incorrectly removed");
  process.exit(1);
}
console.log("✅ Safe HTML preservation passed");

// Test 6: Empty input
console.log("\n--- Test 6: Empty Input ---");
const emptyResult = sanitizeUserInput("");
console.log(`Input: ""`);
console.log(`Valid: ${emptyResult.isValid}`);

if (emptyResult.isValid) {
  console.error("❌ Empty input was marked as valid");
  process.exit(1);
}
console.log("✅ Empty input validation passed");

// Test 7: Long message (should truncate)
console.log("\n--- Test 7: Long Message ---");
const longText = "a".repeat(11_000);
const longResult = sanitizeUserInput(longText);
console.log(`Input length: ${longText.length}`);
console.log(`Output length: ${longResult.sanitized.length}`);
console.log(`Truncated: ${longResult.truncated}`);

if (!longResult.truncated) {
  console.error("❌ Long message was not marked as truncated");
  process.exit(1);
}
if (longResult.sanitized.length > 10_000) {
  console.error("❌ Message was not truncated to max length");
  process.exit(1);
}
console.log("✅ Message truncation passed");

console.log("\n✅ All input sanitization tests passed");

// Test Markdown Sanitizer
const dirtyMarkdown = "Some text <iframe src='evil.com'></iframe>";
const cleanMarkdown = sanitizeMarkdownOutput(dirtyMarkdown);
console.log(`Dirty Markdown: ${dirtyMarkdown}`);
console.log(`Clean Markdown: ${cleanMarkdown}`);

if (cleanMarkdown.includes("<iframe")) {
  console.error("❌ Iframe was not removed from markdown");
  process.exit(1);
}
console.log("✅ Markdown sanitization passed");

console.log("🎉 All tests passed!");
