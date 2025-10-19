import { createCerebras } from "@ai-sdk/cerebras";
import { google } from "@ai-sdk/google";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

// Cerebras provider with load balancing (primary)
const getCerebrasProvider = () => {
  if (typeof window === "undefined") {
    try {
      const balancer =
        require("./cerebras-key-balancer").getBalancedCerebrasProvider();
      console.log("[Providers] Using Cerebras key balancer");
      return balancer;
    } catch (error) {
      console.warn(
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
      console.log("[Providers] Using Gemini key balancer");
      return balancer;
    } catch (error) {
      console.warn(
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
console.log("[Providers] Cerebras provider initialized:", !!cerebrasProvider);
console.log("[Providers] Google provider initialized:", !!googleProvider);

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
            console.log(
              "[Providers] Using Cerebras gpt-oss-120b as default chat model"
            );
            return cerebrasProvider("gpt-oss-120b");
          } catch (error) {
            console.warn(
              "[Providers] Cerebras unavailable for chat, falling back to Gemini:",
              error
            );
            return googleProvider("gemini-2.5-flash");
          }
        })(),

        // Advanced reasoning - Cerebras gpt-oss-120b (131K context, reasoning capable)
        "chat-model-reasoning": (() => {
          try {
            console.log(
              "[Providers] Using Cerebras gpt-oss-120b for reasoning"
            );
            return cerebrasProvider("gpt-oss-120b");
          } catch (error) {
            console.warn(
              "[Providers] Cerebras unavailable for reasoning, falling back to Gemini Pro:",
              error
            );
            return googleProvider("gemini-2.5-pro");
          }
        })(),

        // Multimodal - Gemini Flash (Cerebras doesn't support image understanding yet)
        "chat-model-image": (() => {
          try {
            console.log(
              "[Providers] Using Gemini for image understanding (Cerebras doesn't support images)"
            );
            return googleProvider("gemini-2.5-flash");
          } catch (error) {
            console.error(
              "[Providers] Error creating chat-model-image:",
              error
            );
            return google("gemini-2.5-flash");
          }
        })(),

        // Title generation - Cerebras llama-3.3-70b (128K context, better for summarization)
        "title-model": (() => {
          try {
            return cerebrasProvider("llama-3.3-70b");
          } catch (error) {
            console.warn(
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
            console.warn(
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
