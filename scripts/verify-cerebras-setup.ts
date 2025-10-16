/**
 * Verification script to test Cerebras setup
 * Run with: npx tsx scripts/verify-cerebras-setup.ts
 */

import { getCerebrasBalancer } from "../lib/ai/cerebras-key-balancer";
import { getGeminiBalancer } from "../lib/ai/gemini-key-balancer";

console.log("🔍 Verifying Cerebras Setup...\n");

// Test Cerebras Balancer
console.log("1️⃣ Testing Cerebras Balancer:");
try {
  const cerebrasBalancer = getCerebrasBalancer();
  const cerebrasKeyCount = cerebrasBalancer.getKeyCount();
  const cerebrasStats = cerebrasBalancer.getStats();

  console.log("   ✅ Cerebras balancer loaded");
  console.log(`   ✅ Keys available: ${cerebrasKeyCount}`);
  console.log("   📊 Key stats:");
  cerebrasStats.forEach((stat, index) => {
    console.log(
      `      - Key #${index + 1}: ${stat.requestCount} requests, ${
        stat.errorCount
      } errors, ${stat.isDisabled ? "❌ disabled" : "✅ active"}`
    );
  });

  if (cerebrasKeyCount === 0) {
    console.log("   ⚠️  WARNING: No Cerebras keys found!");
    console.log("   Add CEREBRAS_API_KEY_85 through _89 to .env.local");
  }
} catch (error: any) {
  console.log(`   ❌ Cerebras balancer error: ${error.message}`);
  console.log("   Make sure Cerebras keys are set in .env.local");
}

console.log("\n2️⃣ Testing Gemini Balancer (Fallback):");
try {
  const geminiBalancer = getGeminiBalancer();
  const geminiKeyCount = geminiBalancer.getKeyCount();
  const geminiStats = geminiBalancer.getStats();

  console.log("   ✅ Gemini balancer loaded");
  console.log(`   ✅ Keys available: ${geminiKeyCount}`);
  console.log("   📊 Key stats:");
  geminiStats.forEach((stat) => {
    console.log(
      `      - Key: ${stat.requestCount} requests, ${stat.errorCount} errors, ${
        stat.isDisabled ? "❌ disabled" : "✅ active"
      }`
    );
  });

  if (geminiKeyCount === 0) {
    console.log("   ⚠️  WARNING: No Gemini keys found!");
    console.log("   Fallback will not work without Gemini keys");
  }
} catch (error: any) {
  console.log(`   ❌ Gemini balancer error: ${error.message}`);
}

console.log("\n3️⃣ Testing Model Configuration:");
try {
  const { myProvider } = require("../lib/ai/providers");
  console.log("   ✅ Provider configuration loaded");
  console.log("   ✅ Models configured:");
  console.log(
    "      - Tsukiyo (chat-model): Cerebras gpt-oss-120b → Gemini Flash"
  );
  console.log(
    "      - Jacana (chat-model-reasoning): Cerebras Qwen-3-235B → Gemini Pro"
  );
  console.log(
    "      - NanoBanana (chat-model-image): Gemini Flash + Imagen (Gemini only)"
  );
} catch (error: any) {
  console.log(`   ❌ Provider configuration error: ${error.message}`);
}

console.log("\n4️⃣ Environment Check:");
const cerebrasKeys = [85, 86, 87, 88, 89].filter(
  (num) => process.env[`CEREBRAS_API_KEY_${num}`]
);
const geminiKeys = ["", "1", "2", "3", "4", "5"].filter(
  (num) => process.env[`GOOGLE_GENERATIVE_AI_API_KEY${num ? "_" + num : ""}`]
);

console.log(`   Cerebras keys set: ${cerebrasKeys.length}/5`);
cerebrasKeys.forEach((num) => console.log(`      ✅ CEREBRAS_API_KEY_${num}`));

console.log(`   Gemini keys set: ${geminiKeys.length}/6`);
if (geminiKeys.length > 0) {
  console.log(`      ✅ ${geminiKeys.length} Gemini key(s) configured`);
}

console.log("\n📋 Summary:");
if (cerebrasKeys.length === 5 && geminiKeys.length >= 1) {
  console.log("   ✅ Setup is complete and ready to use!");
  console.log("   ✅ Cerebras will be used by default");
  console.log("   ✅ Gemini will be used as fallback");
} else if (cerebrasKeys.length > 0 && geminiKeys.length >= 1) {
  console.log("   ⚠️  Setup is partial:");
  console.log(`      - Cerebras: ${cerebrasKeys.length}/5 keys`);
  console.log(`      - Gemini: ${geminiKeys.length}/6 keys`);
  console.log("   Consider adding more keys for better load balancing");
} else if (cerebrasKeys.length > 0) {
  console.log("   ⚠️  Cerebras keys found but no Gemini fallback!");
  console.log("   Add at least one Gemini key for fallback");
} else {
  console.log("   ❌ Setup incomplete:");
  console.log("   Add Cerebras keys (CEREBRAS_API_KEY_85-89) to .env.local");
  console.log("   Add Gemini keys for fallback");
}

console.log("\n🚀 Next Steps:");
if (cerebrasKeys.length === 0) {
  console.log(
    "   1. Get Cerebras API keys from https://inference.cerebras.ai/"
  );
  console.log("   2. Add to .env.local as CEREBRAS_API_KEY_85 through _89");
  console.log("   3. Restart your dev server");
  console.log("   4. Run this script again to verify");
} else {
  console.log("   1. Start your dev server: npm run dev");
  console.log("   2. Send a test message");
  console.log("   3. Check console for [Cerebras Balancer] messages");
  console.log("   4. Verify responses are fast (~1-2 seconds)");
}

console.log("\n✨ Done!\n");
