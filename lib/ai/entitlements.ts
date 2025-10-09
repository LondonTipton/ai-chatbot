import type { UserType } from "@/app/(auth)/auth";
import type { ChatModel } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 999_999, // Effectively unlimited for development
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 999_999, // Effectively unlimited for development
    availableChatModelIds: ["chat-model", "chat-model-reasoning"],
  },

  /*
   * TODO: For users with an account and a paid membership
   *
   * Note: For production deployment, consider reducing these limits:
   * - guest: 20-50 messages per day
   * - regular: 100-200 messages per day
   * See MESSAGE_LIMITS.md for detailed configuration guide
   */
};
