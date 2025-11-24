import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(10_000), // Match MAX_INPUT_LENGTH from input-sanitizer
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().min(1), // Changed from uuid() to accept nanoid format
  message: z.object({
    id: z.string().min(1), // Changed from uuid() to accept nanoid format
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum([
    "chat-model",
    "chat-model-reasoning",
    "chat-model-image",
  ]),
  selectedVisibilityType: z.enum(["public", "private"]),
  comprehensiveWorkflowEnabled: z.boolean().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
