import { postRequestBodySchema } from "../app/(chat)/api/chat/schema";

console.log("Testing schema validation with 'hi' message...\n");

const testPayload = {
  id: "kBWXy45VvZPdP0VsjkYCU", // nanoid format (21 chars)
  message: {
    id: "mNoPq67RsTuVwXyZ12345", // nanoid format (21 chars)
    role: "user",
    parts: [
      {
        type: "text",
        text: "hi",
      },
    ],
  },
  selectedChatModel: "chat-model",
  selectedVisibilityType: "private",
};

console.log("Test payload:", JSON.stringify(testPayload, null, 2));

try {
  const result = postRequestBodySchema.parse(testPayload);
  console.log("\n✅ Schema validation PASSED");
  console.log("Parsed result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.log("\n❌ Schema validation FAILED");
  console.error("Error:", error);
}
