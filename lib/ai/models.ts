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
    description:
      "Fast and efficient multimodal model with vision and text capabilities",
  },
  {
    id: "chat-model-reasoning",
    name: "Jacana",
    description:
      "Uses advanced chain-of-thought reasoning for complex problems",
  },
  {
    id: "chat-model-image",
    name: "NanoBanana",
    description:
      "Specialized model for generating images from text descriptions",
  },
];
