import "server-only";

import { streamObject } from "ai";
import { z } from "zod";
import { myProvider } from "@/lib/ai/providers";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { generateUUID } from "@/lib/utils";

const logger = createLogger("services/suggestion-service");

export type RequestSuggestionsParams = {
  documentId: string;
  userId: string;
};

export type SuggestionResult = {
  id: string;
  documentId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  isResolved: boolean;
};

/**
 * Service layer for suggestion operations
 * Generates writing suggestions for documents
 */

/**
 * Request suggestions for a document
 * Generates AI-powered suggestions to improve writing
 */
export async function requestSuggestionsService(
  params: RequestSuggestionsParams
): Promise<SuggestionResult[]> {
  const { documentId, userId } = params;

  logger.log(
    `[SuggestionService] Requesting suggestions for document: ${documentId}`
  );

  // Get the document
  const document = await getDocumentById({ id: documentId });

  if (!document || !document.content) {
    throw new Error(`Document not found or empty: ${documentId}`);
  }

  const suggestions: Omit<
    Suggestion,
    "userId" | "createdAt" | "documentCreatedAt"
  >[] = [];

  // Generate suggestions using AI
  logger.log(
    "[SuggestionService] 🧠 Using Cerebras artifact-model for suggestion generation (reasoning enabled)"
  );
  const { elementStream } = streamObject({
    model: myProvider.languageModel("artifact-model"),
    system:
      "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
    prompt: document.content,
    output: "array",
    schema: z.object({
      originalSentence: z.string().describe("The original sentence"),
      suggestedSentence: z.string().describe("The suggested sentence"),
      description: z.string().describe("The description of the suggestion"),
    }),
  });

  // Collect all suggestions
  for await (const element of elementStream) {
    const suggestion = {
      originalText: element.originalSentence,
      suggestedText: element.suggestedSentence,
      description: element.description,
      id: generateUUID(),
      documentId,
      isResolved: false,
    };

    suggestions.push(suggestion);
  }

  // Save suggestions to database
  await saveSuggestions({
    suggestions: suggestions.map((suggestion) => ({
      ...suggestion,
      userId,
      createdAt: new Date(),
      documentCreatedAt: document.createdAt,
    })),
  });

  logger.log(
    `[SuggestionService] Generated ${suggestions.length} suggestions for document: ${documentId}`
  );

  return suggestions as SuggestionResult[];
}
