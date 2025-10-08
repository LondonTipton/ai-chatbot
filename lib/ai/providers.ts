import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { google } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";
import { getBalancedGoogleProvider } from "./gemini-key-balancer";

// Get load-balanced Google provider for production
const getGoogleProvider = () => {
  if (isTestEnvironment) {
    return google;
  }
  return getBalancedGoogleProvider();
};

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
        "chat-model": getGoogleProvider()("gemini-2.0-flash-exp"),
        "chat-model-reasoning": wrapLanguageModel({
          model: getGoogleProvider()("gemini-2.0-flash-thinking-exp-1219"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": getGoogleProvider()("gemini-2.0-flash-exp"),
        "artifact-model": getGoogleProvider()("gemini-2.0-flash-exp"),
      },
      imageModels: {
        "small-model": getGoogleProvider().imageModel(
          "imagen-3.0-generate-001"
        ),
      },
    });
