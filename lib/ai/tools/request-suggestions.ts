import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import type { ChatMessage, Session } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../providers";

const logger = createLogger("tools/request-suggestions");

type RequestSuggestionsProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

/**
 * AI SDK Tool: Request Suggestions
 *
 * This tool wraps the suggestion service with UI streaming capabilities.
 * It streams suggestions to the UI in real-time as they're generated.
 */
export const requestSuggestions = ({
  session,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: "Request suggestions for a document",
    inputSchema: z.object({
      documentId: z
        .string()
        .describe("The ID of the document to request edits"),
    }),
    execute: async ({ documentId }) => {
      if (!session?.user?.id) {
        throw new Error("User session required to request suggestions");
      }

      const document = await getDocumentById({ id: documentId });

      if (!document || !document.content) {
        return {
          error: "Document not found",
        };
      }

      const suggestions: Omit<
        Suggestion,
        "userId" | "createdAt" | "documentCreatedAt"
      >[] = [];

      // Generate suggestions with streaming to UI
      logger.log(
        "[RequestSuggestions Tool] 🧠 Using Cerebras artifact-model for suggestion generation (reasoning enabled)"
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

      for await (const element of elementStream) {
        // @ts-expect-error todo: fix type
        const suggestion: Suggestion = {
          originalText: element.originalSentence,
          suggestedText: element.suggestedSentence,
          description: element.description,
          id: generateUUID(),
          documentId,
          isResolved: false,
        };

        // Stream to UI
        dataStream.write({
          type: "data-suggestion",
          data: suggestion,
          transient: true,
        });

        suggestions.push(suggestion);
      }

      // Save to database
      const userId = session.user.id;
      await saveSuggestions({
        suggestions: suggestions.map((suggestion) => ({
          ...suggestion,
          userId,
          createdAt: new Date(),
          documentCreatedAt: document.createdAt,
        })),
      });

      return {
        id: documentId,
        title: document.title,
        kind: document.kind,
        message: "Suggestions have been added to the document",
      };
    },
  });
