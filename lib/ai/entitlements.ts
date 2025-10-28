import type { ChatModel } from "./models";

export type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

/**
 * Default entitlements for all authenticated users
 *
 * Note: For production deployment, consider reducing these limits:
 * - Development: 999,999 messages per day (effectively unlimited)
 * - Production: 100-200 messages per day for regular users
 *
 * Future enhancement: Implement tiered entitlements based on subscription level
 */
export const defaultEntitlements: Entitlements = {
  maxMessagesPerDay: 999_999, // Effectively unlimited for development
  availableChatModelIds: ["chat-model", "chat-model-reasoning"],
};
