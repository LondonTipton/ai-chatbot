import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { google } from '@ai-sdk/google';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': google('gemini-2.0-flash-exp'),
        'chat-model-reasoning': wrapLanguageModel({
          model: google('gemini-2.0-flash-thinking-exp-1219'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': google('gemini-2.0-flash-exp'),
        'artifact-model': google('gemini-2.0-flash-exp'),
      },
      imageModels: {
        'small-model': google.imageModel('imagen-3.0-generate-001'),
      },
    });
