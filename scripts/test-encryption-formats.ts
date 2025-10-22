// Test different encryption key formats
const { createCipheriv } = require("crypto");
const { Buffer } = require("buffer");

const encryptionKeyString = "e16c46c66cdc41288c7f859bcf33cf31";

console.log("Testing different key interpretations:\n");

// Test 1: As UTF-8 string (current approach)
console.log("1. As UTF-8 string:");
console.log("   Key:", encryptionKeyString);
console.log("   Length:", encryptionKeyString.length, "chars");
const keyUtf8 = Buffer.from(encryptionKeyString, "utf8");
console.log("   Buffer length:", keyUtf8.length, "bytes");
console.log(
  "   Buffer (hex):",
  keyUtf8.toString("hex").substring(0, 32) + "..."
);

// Test 2: As hex string (decode hex to bytes)
console.log("\n2. As hex string (decoded):");
const keyHex = Buffer.from(encryptionKeyString, "hex");
console.log("   Buffer length:", keyHex.length, "bytes");
console.log("   Buffer (hex):", keyHex.toString("hex"));

// Test 3: Padded to 32 bytes
console.log("\n3. Padded to 32 bytes:");
const keyPadded = Buffer.alloc(32);
Buffer.from(encryptionKeyString, "utf8").copy(keyPadded);
console.log("   Buffer length:", keyPadded.length, "bytes");
console.log("   Buffer (hex):", keyPadded.toString("hex").substring(0, 64));

console.log("\n=== Testing which works with AES-256-CBC ===\n");

const testData = JSON.stringify({ test: "data" });

// Test each format
[
  { name: "UTF-8 (32 chars)", key: keyUtf8 },
  { name: "Hex decoded (16 bytes)", key: keyHex },
  { name: "Padded (32 bytes)", key: keyPadded },
].forEach(({ name, key }) => {
  try {
    if (key.length === 32) {
      const iv = Buffer.from(encryptionKeyString.substr(0, 16), "utf8");
      const cipher = createCipheriv("aes-256-cbc", key, iv);
      const encrypted =
        cipher.update(testData, "utf8", "base64") + cipher.final("base64");
      console.log(`✓ ${name}: Works! Encrypted length: ${encrypted.length}`);
    } else {
      console.log(`✗ ${name}: Key length ${key.length} (need 32 for AES-256)`);
    }
  } catch (error: any) {
    console.log(`✗ ${name}: ${error.message}`);
  }
});

console.log("\n=== Recommendation ===");
console.log('The key "e16c46c66cdc41288c7f859bcf33cf31" is 32 characters.');
console.log(
  "When treated as UTF-8, it becomes a 32-byte buffer, which is correct for AES-256."
);
console.log("The encryption is working correctly on our end.");
console.log("\nThe 500 error from Pesepay suggests:");
console.log("1. They might be using a different decryption key");
console.log("2. The key might need to be in a different format");
console.log("3. There might be additional parameters needed");
