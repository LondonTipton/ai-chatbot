import { Buffer } from "buffer";
import { createCipheriv } from "crypto";

const key = "e16c46c66cdc41288c7f859bcf33cf31";
const ALGORITHM = "aes-256-cbc";

console.log("Testing encryption key format:");
console.log("Key:", key);
console.log("Key length:", key.length);

try {
  const iv = Buffer.from(key.substr(0, 16), "utf8");
  const keyBuffer = Buffer.from(key, "utf8");

  console.log("\nBuffer analysis:");
  console.log("IV buffer length:", iv.length);
  console.log("Key buffer length:", keyBuffer.length);

  console.log("\nAttempting to create cipher...");
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  console.log("✓ Cipher created successfully!");

  // Test encryption
  const testData = "test data";
  const encrypted =
    cipher.update(testData, "utf8", "base64") + cipher.final("base64");
  console.log("✓ Encryption successful!");
  console.log("Encrypted:", encrypted);
} catch (error: any) {
  console.error("✗ Error:", error.message);
  console.error("Error code:", error.code);

  // AES-256 requires 32-byte key
  console.log("\nAES-256-CBC requirements:");
  console.log("- Key must be exactly 32 bytes");
  console.log("- IV must be exactly 16 bytes");
  console.log(
    "\nYour key as UTF-8 buffer is",
    Buffer.from(key, "utf8").length,
    "bytes"
  );
  console.log(
    "Your IV (first 16 chars) as UTF-8 buffer is",
    Buffer.from(key.substr(0, 16), "utf8").length,
    "bytes"
  );
}
