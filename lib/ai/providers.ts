import { createCerebras } from "@ai-sdk/cerebras";
import { google } from "@ai-sdk/google";
import { customProvider } from "ai";
import { createLogger } from "@/lib/logger";
import { isTestEnvironment } from "../constants";

const logger = createLogger("ai/providers");

// Cerebras provider with load balancing (primary)
const getCerebrasProvider = () => {
  if (typeof window === "undefined") {
    try {
      const balancer =
        require("./cerebras-key-balancer").getBalancedCerebrasProvider();
      logger.log("[Providers] Using Cerebras key balancer");
      return balancer;
    } catch (error) {
      logger.warn(
        "[Providers] Cerebras balancer not available, falling back to direct provider:",
        error
      );
      return createCerebras();
    }
  }
  return createCerebras();
};

// Gemini provider with load balancing (fallback for image generation)
const getGoogleProvider = () => {
  if (typeof window === "undefined") {
    try {
      const balancer =
        require("./gemini-key-balancer").getBalancedGoogleProvider();
      logger.log("[Providers] Using Gemini key balancer");
      return balancer;
    } catch (error) {
      logger.warn(
        "[Providers] Gemini balancer not available, falling back to direct provider:",
        error
      );
      return google;
    }
  }
  return google;
};

const cerebrasProvider = getCerebrasProvider();
const googleProvider = getGoogleProvider();
logger.log("[Providers] Cerebras provider initialized:", !!cerebrasProvider);
logger.log("[Providers] Google provider initialized:", !!googleProvider);

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // CEREBRAS FIRST APPROACH: Use Cerebras gpt-oss-120b as default, Gemini as fallback

        // Main chat model - Cerebras gpt-oss-120b (fast, cost-effective, supports tool calling)
        "chat-model": (() => {
          try {
            logger.log(
              "[Providers] Using Cerebras gpt-oss-120b as default chat model"
            );
            return cerebrasProvider("gpt-oss-120b");
          } catch (error) {
            logger.warn(
              "[Providers] Cerebras unavailable for chat, falling back to Gemini:",
              error
            );
            return googleProvider("gemini-2.5-flash");
          }
        })(),

        // Advanced reasoning - Cerebras gpt-oss-120b (131K context, reasoning capable)
        "chat-model-reasoning": (() => {
          try {
            logger.log("[Providers] Using Cerebras gpt-oss-120b for reasoning");
            return cerebrasProvider("gpt-oss-120b");
          } catch (error) {
            logger.warn(
              "[Providers] Cerebras unavailable for reasoning, falling back to Gemini Pro:",
              error
            );
            return googleProvider("gemini-2.5-pro");
          }
        })(),

        // Multimodal - Gemini Flash (Cerebras doesn't support image understanding yet)
        "chat-model-image": (() => {
          try {
            logger.log(
              "[Providers] Using Gemini for image understanding (Cerebras doesn't support images)"
            );
            return googleProvider("gemini-2.5-flash");
          } catch (error) {
            logger.error("[Providers] Error creating chat-model-image:", error);
            return google("gemini-2.5-flash");
          }
        })(),

        // Title generation - Cerebras gpt-oss-120b (consistent model across all use cases)
        "title-model": (() => {
          try {
            return cerebrasProvider("gpt-oss-120b");
          } catch (error) {
            logger.warn(
              "[Providers] Cerebras unavailable for titles, using Gemini"
            );
            return googleProvider("gemini-2.5-flash");
          }
        })(),

        // Artifact generation - Cerebras llama3.1-8b (fast, no tools needed)
        "artifact-model": (() => {
          try {
            return cerebrasProvider("llama3.1-8b");
          } catch (error) {
            logger.warn(
              "[Providers] Cerebras unavailable for artifacts, using Gemini"
            );
            return googleProvider("gemini-2.5-flash");
          }
        })(),
      },
      imageModels: {
        // Gemini for image generation (Cerebras doesn't support image generation)
        "small-model": googleProvider.imageModel("imagen-3.0-generate-001"),
      },
    });
