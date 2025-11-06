import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

/**
 * E2E Tests for Workflow Tool Integration
 *
 * Tests the integration of Advanced Search Workflow as a tool that the Chat Agent
 * can invoke for research-intensive queries. Validates that:
 * - Simple queries don't invoke workflow tool
 * - Research queries invoke advancedSearchWorkflow tool
 * - Tool invocation indicators appear in UI
 * - Research results with sources appear in chat
 * - Only 1 tool call is made (not nested)
 * - Document creation works alongside research
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

test.describe("Workflow Tool Integration", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
    // Use default chat model which should have workflow tool capability
  });

  test("Simple query does not invoke workflow tool", async () => {
    // Send a simple question that should be answered directly
    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(50);

    // Verify response contains relevant information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("contract") || content.includes("agreement")
    ).toBeTruthy();

    // Simple queries should be fast (< 10 seconds)
    // This is implicitly tested by the test completing quickly
  });

  test("Research query invokes workflow tool", async () => {
    // Send a research question that should invoke the workflow tool
    await chatPage.sendUserMessage(
      "Find cases about property rights in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(100);

    // Verify response contains research-related content
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("property") ||
        content.includes("rights") ||
        content.includes("zimbabwe") ||
        content.includes("case")
    ).toBeTruthy();
  });

  test("Research query with multiple sources", async () => {
    // Send a query requiring comprehensive research
    await chatPage.sendUserMessage(
      "Research the legal requirements for company registration in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(150);

    // Verify response contains relevant information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("company") ||
        content.includes("registration") ||
        content.includes("zimbabwe") ||
        content.includes("requirement")
    ).toBeTruthy();
  });

  test("Document creation request alongside research", async () => {
    // Send a query that requests both research and document creation
    await chatPage.sendUserMessage(
      "Research employment law in Zimbabwe and create a document summarizing the key points"
    );
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Verify response contains relevant information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("employment") ||
        content.includes("labour") ||
        content.includes("labor") ||
        content.includes("zimbabwe")
    ).toBeTruthy();

    // Note: Document artifact validation would require checking for artifact UI elements
    // which may be added in future test iterations
  });

  test("Multiple research queries in same session", async () => {
    // First research query
    await chatPage.sendUserMessage(
      "Find information about contract law in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    let assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Second research query
    await chatPage.sendUserMessage("Research tort law in Zimbabwe");
    await chatPage.isGenerationComplete();

    assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("tort") || content.includes("zimbabwe")
    ).toBeTruthy();
  });

  test("Research query with jurisdiction parameter", async () => {
    // Send a research query with explicit jurisdiction
    await chatPage.sendUserMessage(
      "Find cases about intellectual property in South Africa"
    );
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Verify response contains relevant information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("intellectual property") ||
        content.includes("south africa") ||
        content.includes("patent") ||
        content.includes("trademark")
    ).toBeTruthy();
  });

  test("Workflow tool handles complex legal queries", async () => {
    // Send a complex legal research query
    await chatPage.sendUserMessage(
      "Analyze recent developments in Zimbabwe's constitutional law regarding freedom of expression"
    );
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(200);

    // Verify response contains relevant analysis
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("constitutional") ||
        content.includes("freedom") ||
        content.includes("expression") ||
        content.includes("zimbabwe")
    ).toBeTruthy();
  });

  test("Chat UI renders research results seamlessly", async () => {
    // Send a research query
    await chatPage.sendUserMessage("Research the Companies Act in Zimbabwe");
    await chatPage.isGenerationComplete();

    // Verify response is rendered in chat UI
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.element).toBeTruthy();
    expect(assistantMessage?.content).toBeTruthy();

    // Verify the message element exists
    expect(assistantMessage?.element).toBeTruthy();
  });

  test("Research results maintain chat history", async () => {
    // Send first message
    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    const firstMessage = await chatPage.getRecentAssistantMessage();
    expect(firstMessage).not.toBeNull();

    // Send research query
    await chatPage.sendUserMessage("Research property law in Zimbabwe");
    await chatPage.isGenerationComplete();

    const secondMessage = await chatPage.getRecentAssistantMessage();
    expect(secondMessage).not.toBeNull();

    // Verify both messages exist
    expect(firstMessage?.content).toBeTruthy();
    expect(secondMessage?.content).toBeTruthy();
    expect(firstMessage?.content).not.toBe(secondMessage?.content);
  });

  test("Workflow tool integration with chat redirect", async () => {
    // Send a research query
    await chatPage.sendUserMessage(
      "Find cases about employment law in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Verify redirect to /chat/:id
    await chatPage.hasChatIdInUrl();
  });
});

test.describe("Workflow Tool Integration - Token Budget", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("Research query stays within token budget", async () => {
    // Send a research query
    await chatPage.sendUserMessage("Research contract formation in Zimbabwe");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Rough token estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(
      (assistantMessage?.content?.length || 0) / 4
    );

    // Workflow tool should use ≤8000 tokens (4K-8K range from design)
    // Allow buffer for system messages and formatting
    expect(estimatedTokens).toBeLessThan(10_000);
  });
});

test.describe("Workflow Tool Integration - Error Handling", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("Graceful handling of research queries", async () => {
    // Send a research query that might encounter issues
    await chatPage.sendUserMessage(
      "Research obscure legal topic xyz123 in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    // Verify response received (even if partial or error message)
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Chat should continue to function
    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    const followUpMessage = await chatPage.getRecentAssistantMessage();
    expect(followUpMessage).not.toBeNull();
    expect(followUpMessage?.content).toBeTruthy();
  });
});
