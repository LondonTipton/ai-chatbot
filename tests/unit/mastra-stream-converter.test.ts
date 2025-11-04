import { expect, test } from "@playwright/test";
import type { MastraStreamEvent } from "@/lib/ai/mastra-router";
import {
  convertMastraResultToUIMessage,
  convertMastraStreamToUI,
  type UIStreamChunk,
} from "@/lib/ai/mastra-stream-converter";

test.describe("Mastra Stream Converter", () => {
  test.describe("convertMastraStreamToUI", () => {
    test("should convert progress events to UI format", async () => {
      // Create a mock Mastra stream with progress events
      const mockMastraStream =
        async function* (): AsyncGenerator<MastraStreamEvent> {
          await Promise.resolve(); // Satisfy async requirement
          yield {
            type: "progress",
            step: 1,
            totalSteps: 3,
            agent: "search-agent",
            message: "Searching for information...",
          };
          yield {
            type: "progress",
            step: 2,
            totalSteps: 3,
            agent: "extract-agent",
            message: "Extracting content...",
          };
          yield {
            type: "complete",
            response: "This is the final response from the workflow.",
            duration: 1500,
            agentsUsed: 3,
          };
        };

      const uiStream = convertMastraStreamToUI(mockMastraStream());
      const reader = uiStream.getReader();
      const chunks: UIStreamChunk[] = [];

      // Read all chunks
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          chunks.push(value);
        }
      }

      // Verify we got the expected chunks
      expect(chunks.length).toBeGreaterThan(0);

      // First chunk should be message-start
      expect(chunks[0].type).toBe("message-start");
      expect(chunks[0]).toHaveProperty("id");
      expect(chunks[0]).toHaveProperty("role", "assistant");

      // Should have progress chunks
      const progressChunks = chunks.filter((c) => c.type === "data-progress");
      expect(progressChunks.length).toBe(2);

      // Should have text-delta chunks
      const textDeltas = chunks.filter((c) => c.type === "text-delta");
      expect(textDeltas.length).toBeGreaterThan(0);

      // Last chunk should be message-complete
      const lastChunk = chunks.at(-1);
      expect(lastChunk?.type).toBe("message-complete");
      if (lastChunk && lastChunk.type === "message-complete") {
        expect(lastChunk.message.role).toBe("assistant");
        expect(lastChunk.message.parts[0].type).toBe("text");
        expect(lastChunk.message.parts[0].text).toContain(
          "final response from the workflow"
        );
      }
    });

    test("should handle error events", async () => {
      const mockErrorStream =
        async function* (): AsyncGenerator<MastraStreamEvent> {
          await Promise.resolve(); // Satisfy async requirement
          yield {
            type: "error",
            error: "Something went wrong",
            duration: 500,
          };
        };

      const uiStream = convertMastraStreamToUI(mockErrorStream());
      const reader = uiStream.getReader();
      const chunks: UIStreamChunk[] = [];

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          chunks.push(value);
        }
      }

      // Should have message-start and error chunks
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].type).toBe("message-start");

      const errorChunk = chunks.find((c) => c.type === "error");
      expect(errorChunk).toBeDefined();
      if (errorChunk && errorChunk.type === "error") {
        expect(errorChunk.error).toBe("Something went wrong");
      }
    });

    test("should handle complete event without progress", async () => {
      const mockSimpleStream =
        async function* (): AsyncGenerator<MastraStreamEvent> {
          await Promise.resolve(); // Satisfy async requirement
          yield {
            type: "complete",
            response: "Simple response without progress updates.",
            duration: 800,
            agentsUsed: 1,
          };
        };

      const uiStream = convertMastraStreamToUI(mockSimpleStream());
      const reader = uiStream.getReader();
      const chunks: UIStreamChunk[] = [];

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          chunks.push(value);
        }
      }

      // Should have message-start, text-deltas, and message-complete
      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks[0].type).toBe("message-start");

      const lastChunk = chunks.at(-1);
      expect(lastChunk?.type).toBe("message-complete");
    });
  });

  test.describe("convertMastraResultToUIMessage", () => {
    test("should convert result with steps to UI message", () => {
      const result = {
        success: true,
        response: "Final analysis complete.",
        steps: [
          { agent: "search-agent", output: "Found 5 sources" },
          { agent: "extract-agent", output: "Extracted content" },
          { agent: "analyze-agent", output: "Analysis complete" },
        ],
      };

      const message = convertMastraResultToUIMessage(result);

      expect(message.role).toBe("assistant");
      expect(message.parts.length).toBe(1);
      expect(message.parts[0].type).toBe("text");
      expect(message.parts[0].text).toContain("Workflow Progress");
      expect(message.parts[0].text).toContain("search-agent");
      expect(message.parts[0].text).toContain("Final analysis complete");
    });

    test("should convert result without steps to UI message", () => {
      const result = {
        success: true,
        response: "Simple response without workflow steps.",
      };

      const message = convertMastraResultToUIMessage(result);

      expect(message.role).toBe("assistant");
      expect(message.parts.length).toBe(1);
      expect(message.parts[0].type).toBe("text");
      expect(message.parts[0].text).toBe(
        "Simple response without workflow steps."
      );
      expect(message.parts[0].text).not.toContain("Workflow Progress");
    });

    test("should handle steps with errors", () => {
      const result = {
        success: false,
        response: "Partial response due to errors.",
        steps: [
          { agent: "search-agent", output: "Found sources" },
          {
            agent: "extract-agent",
            output: "",
            error: "Extraction failed",
          },
        ],
      };

      const message = convertMastraResultToUIMessage(result);

      expect(message.parts[0].text).toContain("⚠️ Error: Extraction failed");
      expect(message.parts[0].text).toContain("Partial response due to errors");
    });
  });
});
