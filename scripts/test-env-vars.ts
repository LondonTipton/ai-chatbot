/**
 * Test if environment variables are loaded
 * Run with: npx tsx scripts/test-env-vars.ts
 */

console.log("🔍 Testing Environment Variables...\n");

// Test Cerebras keys
console.log("Cerebras Keys:");
for (let i = 85; i <= 89; i++) {
  const key = process.env[`CEREBRAS_API_KEY_${i}`];
  if (key) {
    console.log(`  ✅ CEREBRAS_API_KEY_${i}: ${key.substring(0, 15)}...`);
  } else {
    console.log(`  ❌ CEREBRAS_API_KEY_${i}: NOT SET`);
  }
}

// Test Gemini keys
console.log("\nGemini Keys:");
const geminiPrimary = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (geminiPrimary) {
  console.log(
    `  ✅ GOOGLE_GENERATIVE_AI_API_KEY: ${geminiPrimary.substring(0, 15)}...`
  );
} else {
  console.log("  ❌ GOOGLE_GENERATIVE_AI_API_KEY: NOT SET");
}

for (let i = 1; i <= 5; i++) {
  const key = process.env[`GOOGLE_GENERATIVE_AI_API_KEY_${i}`];
  if (key) {
    console.log(
      `  ✅ GOOGLE_GENERATIVE_AI_API_KEY_${i}: ${key.substring(0, 15)}...`
    );
  } else {
    console.log(`  ❌ GOOGLE_GENERATIVE_AI_API_KEY_${i}: NOT SET`);
  }
}

console.log("\n📋 Summary:");
const cerebrasCount = [85, 86, 87, 88, 89].filter(
  (i) => process.env[`CEREBRAS_API_KEY_${i}`]
).length;
const geminiCount = ["", "_1", "_2", "_3", "_4", "_5"].filter(
  (suffix) => process.env[`GOOGLE_GENERATIVE_AI_API_KEY${suffix}`]
).length;

console.log(`  Cerebras keys: ${cerebrasCount}/5`);
console.log(`  Gemini keys: ${geminiCount}/6`);

if (cerebrasCount === 0) {
  console.log("\n⚠️  WARNING: No Cerebras keys found!");
  console.log("  Make sure .env.local is in the root directory");
  console.log("  Make sure there are no spaces around the = sign");
  console.log(
    "  Make sure the file is named exactly .env.local (not .env.local.txt)"
  );
}

console.log("\n✨ Done!\n");
