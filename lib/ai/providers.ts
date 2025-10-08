import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { google } from "@ai-sdk/google";
import { isTestEnvironment } from "../constants";

// Use balanced provider on server, standard provider on client
const googleProvider =
  typeof window === "undefined"
    ? require("./gemini-key-balancer").getBalancedGoogleProvider()
    : google;

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
        "chat-model": googleProvider("gemini-2.0-flash-exp"),
        "chat-model-reasoning": wrapLanguageModel({
          model: googleProvider("gemini-2.0-flash-thinking-exp"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "chat-model-image": googleProvider("gemini-2.5-flash"),
        "title-model": googleProvider("gemini-2.0-flash-exp"),
        "artifact-model": googleProvider("gemini-2.0-flash-exp"),
      },
      imageModels: {
        "small-model": googleProvider.imageModel("imagen-3.0-generate-001"),
      },
    });
