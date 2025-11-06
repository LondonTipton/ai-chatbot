export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  latency?: string;
  disabled?: boolean;
  comingSoon?: boolean;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Basic",
    description: "Interactive chat with intelligent routing",
    latency: "<1s",
  },
  {
    id: "advanced-model",
    name: "Advanced",
    description: "Coming soon",
    disabled: true,
    comingSoon: true,
  },
];
