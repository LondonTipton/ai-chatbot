import { google } from "@ai-sdk/google";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// Use balanced provider on server, standard provider on client
// The balancer automatically rotates through available keys on each getProvider() call
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
        "chat-model": googleProvider("gemini-2.5-flash"),
        "chat-model-reasoning": wrapLanguageModel({
          model: googleProvider("gemini-2.5-pro"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "chat-model-image": googleProvider("gemini-2.5-flash"),
        "title-model": googleProvider("gemini-2.5-flash"),
        "artifact-model": googleProvider("gemini-2.5-flash"),
      },
      imageModels: {
        "small-model": googleProvider.imageModel("imagen-3.0-generate-001"),
      },
    });
