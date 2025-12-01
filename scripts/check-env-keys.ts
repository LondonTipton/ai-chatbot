import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("Checking for CEREBRAS_API_KEY variables...");

const keys = Object.keys(process.env).filter((key) =>
  key.startsWith("CEREBRAS_API_KEY")
);

if (keys.length === 0) {
  console.log("❌ No environment variables found starting with CEREBRAS_API_KEY");
} else {
  console.log(`✅ Found ${keys.length} keys:`);
  keys.forEach((key) => {
    const value = process.env[key];
    const masked = value
      ? `${value.substring(0, 5)}...${value.substring(value.length - 4)}`
      : "(empty)";
    console.log(`- ${key}: ${masked}`);
  });
}
