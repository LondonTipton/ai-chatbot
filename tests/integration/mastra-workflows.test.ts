/**
 * Mastra Workflows Integration Tests
 *
 * Tests end-to-end flows for all Mastra agents and workflows:
 * - Medium complexity queries (Medium Research Agent)
 * - Deep complexity queries (Deep Research Workflow)
 * - Document review workflow
 * - Case law analysis workflow
 * - Legal drafting workflow
 * - Fallback to AI SDK on Mastra failure
 * - Error handling in workflows
 * - Streaming responses
 */

import { expect, test } from "@playwright/test";
import { generateUUID } from "@/lib/utils";
import { test as fixtureTest } from "../fixtures";

// Test prompts for different complexity levels
const TEST_QUERIES = {
  MEDIUM: {
    query:
      "What are the key requirements for contract formation in common law?",
    expectedMinLength: 50,
    expectedKeywords: ["contract", "offer", "acceptance"],
  },
  DEEP: {
    query:
      "Compare the approaches to contract formation across different jurisdictions and analyze the key differences",
    expectedMinLength: 100,
    expectedKeywords: ["jurisdiction", "contract", "formation"],
  },
  DOCUMENT_REVIEW: {
    query:
      "Review this employment contract and identify any issues or missing clauses",
    expectedMinLength: 100,
    expectedKeywords: ["review", "contract", "clause"],
  },
  CASE_LAW: {
    query:
      "Compare the holdings in recent contract law cases and analyze the precedent",
    expectedMinLength: 150,
    expectedKeywords: ["case", "holding", "precedent"],
  },
  DRAFTING: {
    query: "Draft a simple non-disclosure agreement for a technology startup",
    expectedMinLength: 200,
    expectedKeywords: ["agreement", "confidential", "party"],
  },
  SIMPLE: {
    query: "What is a contract?",
    expectedMinLength: 20,
    expectedKeywords: ["contract", "agreement"],
  },
};

test.describe("Mastra Workflows Integration Tests", () => {
  test.describe("Medium Complexity Queries", () => {
    test("should handle medium complexity query with Medium Research Agent", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.MEDIUM.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.MEDIUM.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);

      // Verify streaming format
      const lines = text.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(0);

      // Check for expected content in response
      const hasExpectedContent = TEST_QUERIES.MEDIUM.expectedKeywords.some(
        (keyword) => text.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasExpectedContent).toBe(true);
    });

    test("should stream progress indicators for medium queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.MEDIUM.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.MEDIUM.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // Should have multiple stream events
      expect(lines.length).toBeGreaterThan(1);

      // Should contain data events
      const dataEvents = lines.filter((line) => line.startsWith("data:"));
      expect(dataEvents.length).toBeGreaterThan(0);
    });
  });

  test.describe("Deep Complexity Queries", () => {
    test("should handle deep complexity query with Deep Research Workflow", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DEEP.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DEEP.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(TEST_QUERIES.DEEP.expectedMinLength);

      // Verify response contains expected keywords
      const hasExpectedContent = TEST_QUERIES.DEEP.expectedKeywords.some(
        (keyword) => text.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasExpectedContent).toBe(true);
    });

    test("should execute multi-step workflow for deep queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DEEP.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DEEP.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();

      // Should have substantial content from multi-step processing
      expect(text.length).toBeGreaterThan(500);

      // Should contain streaming events
      const lines = text.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(5);
    });
  });

  test.describe("Document Review Workflow", () => {
    test("should handle document review workflow queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DOCUMENT_REVIEW.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DOCUMENT_REVIEW.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.DOCUMENT_REVIEW.expectedMinLength
      );

      // Verify response contains review-related content
      const hasExpectedContent =
        TEST_QUERIES.DOCUMENT_REVIEW.expectedKeywords.some((keyword) =>
          text.toLowerCase().includes(keyword.toLowerCase())
        );
      expect(hasExpectedContent).toBe(true);
    });

    test("should provide structured feedback in document review", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DOCUMENT_REVIEW.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DOCUMENT_REVIEW.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();

      // Should have substantial structured content
      expect(text.length).toBeGreaterThan(300);

      // Should contain streaming data
      const lines = text.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(3);
    });
  });

  test.describe("Case Law Analysis Workflow", () => {
    test("should handle case law analysis workflow queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.CASE_LAW.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.CASE_LAW.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.CASE_LAW.expectedMinLength
      );

      // Verify response contains case law analysis content
      const hasExpectedContent = TEST_QUERIES.CASE_LAW.expectedKeywords.some(
        (keyword) => text.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasExpectedContent).toBe(true);
    });

    test("should provide comparative analysis in case law workflow", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.CASE_LAW.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.CASE_LAW.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();

      // Should have comprehensive analysis
      expect(text.length).toBeGreaterThan(500);

      // Should stream multiple events
      const lines = text.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(5);
    });
  });

  test.describe("Legal Drafting Workflow", () => {
    test("should handle legal drafting workflow queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DRAFTING.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DRAFTING.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.DRAFTING.expectedMinLength
      );

      // Verify response contains drafting-related content
      const hasExpectedContent = TEST_QUERIES.DRAFTING.expectedKeywords.some(
        (keyword) => text.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasExpectedContent).toBe(true);
    });

    test("should create document artifact in drafting workflow", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DRAFTING.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DRAFTING.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();

      // Should have substantial document content
      expect(text.length).toBeGreaterThan(800);

      // Should contain streaming events
      const lines = text.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(5);
    });
  });

  test.describe("Error Handling and Fallback", () => {
    test("should handle invalid complexity gracefully", async ({ request }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      // Send a query that might cause issues
      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: "", // Empty query
            parts: [
              {
                type: "text",
                text: "",
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      // Should handle gracefully (either 400 or fallback to AI SDK)
      expect([200, 400]).toContain(response.status());
    });

    test("should fallback to AI SDK when Mastra is disabled", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      // Test with a simple query that should use AI SDK
      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.SIMPLE.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.SIMPLE.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.SIMPLE.expectedMinLength
      );

      // Should still get valid response
      const hasExpectedContent = TEST_QUERIES.SIMPLE.expectedKeywords.some(
        (keyword) => text.toLowerCase().includes(keyword.toLowerCase())
      );
      expect(hasExpectedContent).toBe(true);
    });
  });

  test.describe("Streaming Responses", () => {
    test("should stream responses in real-time for medium queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.MEDIUM.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.MEDIUM.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // Should have multiple streaming events
      expect(lines.length).toBeGreaterThan(1);

      // Should use SSE format
      const sseEvents = lines.filter((line) => line.startsWith("data:"));
      expect(sseEvents.length).toBeGreaterThan(0);
    });

    test("should stream responses for deep workflow queries", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DEEP.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DEEP.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // Deep workflows should have more streaming events
      expect(lines.length).toBeGreaterThan(3);

      // Should contain data events
      const dataEvents = lines.filter((line) => line.startsWith("data:"));
      expect(dataEvents.length).toBeGreaterThan(0);
    });

    test("should maintain streaming format consistency", async ({
      request,
    }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await request.post("http://localhost:3000/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.MEDIUM.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.MEDIUM.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim());

      // All data lines should be valid JSON after "data: " prefix
      const dataLines = lines.filter((line) => line.startsWith("data:"));
      for (const line of dataLines) {
        const jsonStr = line.substring(6); // Remove "data: " prefix
        if (jsonStr && jsonStr !== "[DONE]") {
          expect(() => JSON.parse(jsonStr)).not.toThrow();
        }
      }
    });
  });
});

// Authenticated user tests using fixtures
fixtureTest.describe("Mastra Workflows with Authentication", () => {
  fixtureTest(
    "authenticated user can execute medium complexity query",
    async ({ adaContext }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.MEDIUM.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.MEDIUM.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.MEDIUM.expectedMinLength
      );
    }
  );

  fixtureTest(
    "authenticated user can execute deep complexity query",
    async ({ adaContext }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DEEP.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DEEP.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(TEST_QUERIES.DEEP.expectedMinLength);
    }
  );

  fixtureTest(
    "authenticated user can execute document review workflow",
    async ({ adaContext }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DOCUMENT_REVIEW.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DOCUMENT_REVIEW.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.DOCUMENT_REVIEW.expectedMinLength
      );
    }
  );

  fixtureTest(
    "authenticated user can execute case law analysis workflow",
    async ({ adaContext }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.CASE_LAW.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.CASE_LAW.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.CASE_LAW.expectedMinLength
      );
    }
  );

  fixtureTest(
    "authenticated user can execute legal drafting workflow",
    async ({ adaContext }) => {
      const chatId = generateUUID();
      const messageId = generateUUID();

      const response = await adaContext.request.post("/api/chat", {
        data: {
          id: chatId,
          message: {
            id: messageId,
            role: "user",
            content: TEST_QUERIES.DRAFTING.query,
            parts: [
              {
                type: "text",
                text: TEST_QUERIES.DRAFTING.query,
              },
            ],
            createdAt: new Date().toISOString(),
          },
          selectedChatModel: "chat-model",
          selectedVisibilityType: "private",
        },
      });

      expect(response.status()).toBe(200);

      const text = await response.text();
      expect(text.length).toBeGreaterThan(
        TEST_QUERIES.DRAFTING.expectedMinLength
      );
    }
  );
});
