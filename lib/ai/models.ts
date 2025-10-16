export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Tsukiyo",
    description: "Fast and efficient model for everyday legal queries",
  },
  {
    id: "chat-model-reasoning",
    name: "Jacana",
    description:
      "More powerful model with greater reasoning for complex legal analysis",
  },
  {
    id: "chat-model-image",
    name: "NanoBanana",
    description: "Image generation powered by Google Gemini Imagen 3.0",
  },
];
