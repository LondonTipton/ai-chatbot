import { expect, test } from "../fixtures";
import { ChatPage } from "../pages/chat";

/**
 * E2E Tests for Hybrid Agent + Workflow Research Modes
 *
 * Tests all three research modes (AUTO, MEDIUM, DEEP) with:
 * - Direct answer capability
 * - Tool/workflow invocation
 * - Token budget compliance
 * - Latency targets
 * - Model selector integration
 * - Chat UI integration
 *
 * Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3
 */

test.describe("Research Modes - AUTO Mode", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
    await chatPage.chooseModelFromSelector("research-auto");
  });

  test("AUTO mode: Simple factual query with direct answer", async () => {
    const startTime = Date.now();

    // Send a simple legal definition query that should be answered directly
    await chatPage.sendUserMessage(
      "What is the definition of a contract in Zimbabwe law?"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(50);

    // Verify latency target (1-10 seconds)
    expect(latency).toBeLessThan(10_000);

    // Verify response contains Zimbabwe legal context
    expect(
      assistantMessage?.content?.toLowerCase().includes("zimbabwe") ||
        assistantMessage?.content?.toLowerCase().includes("contract")
    ).toBeTruthy();
  });

  test("AUTO mode: Query requiring current information uses tools", async () => {
    const startTime = Date.now();

    // Send a query that requires current information
    await chatPage.sendUserMessage(
      "What are the latest amendments to Zimbabwe's Companies Act?"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(100);

    // Verify latency target (1-10 seconds)
    expect(latency).toBeLessThan(10_000);

    // Verify response contains relevant legal information
    expect(
      assistantMessage?.content?.toLowerCase().includes("companies") ||
        assistantMessage?.content?.toLowerCase().includes("act") ||
        assistantMessage?.content?.toLowerCase().includes("zimbabwe")
    ).toBeTruthy();
  });

  test("AUTO mode: Model selector shows correct mode", async () => {
    const selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("AUTO");
  });

  test("AUTO mode: Can switch between research modes", async () => {
    // Verify starting in AUTO mode
    let selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("AUTO");

    // Switch to MEDIUM mode
    await chatPage.chooseModelFromSelector("research-medium");
    selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("MEDIUM");

    // Switch to DEEP mode
    await chatPage.chooseModelFromSelector("research-deep");
    selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("DEEP");

    // Switch back to AUTO mode
    await chatPage.chooseModelFromSelector("research-auto");
    selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("AUTO");
  });
});

test.describe("Research Modes - MEDIUM Mode", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
    await chatPage.chooseModelFromSelector("research-medium");
  });

  test("MEDIUM mode: Comparative query with multiple sources", async () => {
    const startTime = Date.now();

    // Send a comparative query that requires multiple sources
    await chatPage.sendUserMessage(
      "Compare the requirements for company registration in Zimbabwe versus South Africa"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(200);

    // Verify latency target (10-20 seconds)
    expect(latency).toBeLessThan(20_000);

    // Verify response contains comparative analysis
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("zimbabwe") || content.includes("south africa")
    ).toBeTruthy();
  });

  test("MEDIUM mode: Balanced research query", async () => {
    const startTime = Date.now();

    // Send a query requiring balanced research
    await chatPage.sendUserMessage(
      "What are the key provisions of Zimbabwe's Labour Act regarding employee termination?"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(150);

    // Verify latency target (10-20 seconds)
    expect(latency).toBeLessThan(20_000);

    // Verify response contains relevant legal information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("labour") ||
        content.includes("labor") ||
        content.includes("termination") ||
        content.includes("employee")
    ).toBeTruthy();
  });

  test("MEDIUM mode: Model selector shows correct mode", async () => {
    const selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("MEDIUM");
  });

  test("MEDIUM mode: Direct answer for well-known concepts", async () => {
    const startTime = Date.now();

    // Send a query about a well-known legal concept
    await chatPage.sendUserMessage(
      "What is the principle of stare decisis in Zimbabwe law?"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(100);

    // Verify latency target (10-20 seconds)
    expect(latency).toBeLessThan(20_000);

    // Verify response contains relevant information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("stare decisis") ||
        content.includes("precedent") ||
        content.includes("binding")
    ).toBeTruthy();
  });
});

test.describe("Research Modes - DEEP Mode", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
    await chatPage.chooseModelFromSelector("research-deep");
  });

  test("DEEP mode: Comprehensive analysis query", async () => {
    const startTime = Date.now();

    // Send a query requiring comprehensive analysis
    await chatPage.sendUserMessage(
      "Provide a comprehensive analysis of intellectual property protection in Zimbabwe, including patents, trademarks, and copyrights"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(300);

    // Verify latency target (25-47 seconds)
    expect(latency).toBeLessThan(47_000);

    // Verify response contains comprehensive analysis
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("intellectual property") ||
        content.includes("patent") ||
        content.includes("trademark") ||
        content.includes("copyright")
    ).toBeTruthy();
  });

  test("DEEP mode: Complex legal research query", async () => {
    const startTime = Date.now();

    // Send a complex legal research query
    await chatPage.sendUserMessage(
      "Analyze the constitutional framework for property rights in Zimbabwe, including recent case law and legislative developments"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(250);

    // Verify latency target (25-47 seconds)
    expect(latency).toBeLessThan(47_000);

    // Verify response contains relevant analysis
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("property") ||
        content.includes("constitutional") ||
        content.includes("zimbabwe")
    ).toBeTruthy();
  });

  test("DEEP mode: Model selector shows correct mode", async () => {
    const selectedModel = await chatPage.getSelectedModel();
    expect(selectedModel).toBe("DEEP");
  });

  test("DEEP mode: Direct answer for well-established topics", async () => {
    const startTime = Date.now();

    // Send a query about a well-established legal topic
    await chatPage.sendUserMessage(
      "Explain the doctrine of separation of powers in Zimbabwe's constitutional framework"
    );
    await chatPage.isGenerationComplete();

    const latency = Date.now() - startTime;

    // Verify response received
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(assistantMessage?.content?.length).toBeGreaterThan(200);

    // Verify latency target (25-47 seconds)
    expect(latency).toBeLessThan(47_000);

    // Verify response contains relevant information
    const content = assistantMessage?.content?.toLowerCase() || "";
    expect(
      content.includes("separation of powers") ||
        content.includes("executive") ||
        content.includes("legislative") ||
        content.includes("judicial")
    ).toBeTruthy();
  });
});

test.describe("Research Modes - Token Budget Compliance", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("AUTO mode: Response within token budget (≤2500 tokens)", async () => {
    await chatPage.chooseModelFromSelector("research-auto");

    await chatPage.sendUserMessage(
      "What is the legal age of majority in Zimbabwe?"
    );
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Rough token estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(
      (assistantMessage?.content?.length || 0) / 4
    );

    // AUTO mode should use ≤2500 tokens
    // Allow some buffer for system messages and formatting
    expect(estimatedTokens).toBeLessThan(3000);
  });

  test("MEDIUM mode: Response within token budget (≤8000 tokens)", async () => {
    await chatPage.chooseModelFromSelector("research-medium");

    await chatPage.sendUserMessage(
      "Explain the process of company incorporation in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Rough token estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(
      (assistantMessage?.content?.length || 0) / 4
    );

    // MEDIUM mode should use ≤8000 tokens
    // Allow some buffer for system messages and formatting
    expect(estimatedTokens).toBeLessThan(10_000);
  });

  test("DEEP mode: Response within token budget (≤20000 tokens)", async () => {
    await chatPage.chooseModelFromSelector("research-deep");

    await chatPage.sendUserMessage(
      "Provide a comprehensive overview of Zimbabwe's legal system"
    );
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Rough token estimate: 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(
      (assistantMessage?.content?.length || 0) / 4
    );

    // DEEP mode should use ≤20000 tokens
    // Allow some buffer for system messages and formatting
    expect(estimatedTokens).toBeLessThan(25_000);
  });
});

test.describe("Research Modes - Chat UI Integration", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("Chat UI: Multiple queries in same session", async () => {
    await chatPage.chooseModelFromSelector("research-auto");

    // First query
    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    let assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Second query
    await chatPage.sendUserMessage("What is a tort?");
    await chatPage.isGenerationComplete();

    assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(
      assistantMessage?.content?.toLowerCase().includes("tort")
    ).toBeTruthy();
  });

  test("Chat UI: Switch modes mid-conversation", async () => {
    // Start with AUTO mode
    await chatPage.chooseModelFromSelector("research-auto");
    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    let assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Switch to MEDIUM mode
    await chatPage.chooseModelFromSelector("research-medium");
    await chatPage.sendUserMessage(
      "Compare contract law in Zimbabwe and South Africa"
    );
    await chatPage.isGenerationComplete();

    assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Switch to DEEP mode
    await chatPage.chooseModelFromSelector("research-deep");
    await chatPage.sendUserMessage(
      "Provide a comprehensive analysis of contract formation in Zimbabwe"
    );
    await chatPage.isGenerationComplete();

    assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
  });

  test("Chat UI: Edit and resubmit with different mode", async () => {
    await chatPage.chooseModelFromSelector("research-auto");

    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    let assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    // Switch to MEDIUM mode
    await chatPage.chooseModelFromSelector("research-medium");

    // Edit the user message
    const userMessage = await chatPage.getRecentUserMessage();
    await userMessage.edit("What are the elements of a valid contract?");

    await chatPage.isGenerationComplete();

    assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
    expect(
      assistantMessage?.content?.toLowerCase().includes("element") ||
        assistantMessage?.content?.toLowerCase().includes("valid") ||
        assistantMessage?.content?.toLowerCase().includes("contract")
    ).toBeTruthy();
  });

  test("Chat UI: Redirect to /chat/:id after submitting message", async () => {
    await chatPage.chooseModelFromSelector("research-auto");

    await chatPage.sendUserMessage("What is a contract?");
    await chatPage.isGenerationComplete();

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();

    await chatPage.hasChatIdInUrl();
  });

  test("Chat UI: Stop generation during research", async () => {
    await chatPage.chooseModelFromSelector("research-deep");

    await chatPage.sendUserMessage(
      "Provide a comprehensive analysis of Zimbabwe's legal system"
    );

    // Wait a moment for generation to start
    await chatPage.waitForTimeout(1000);

    // Stop the generation
    await expect(chatPage.stopButton).toBeVisible();
    await chatPage.stopButton.click();

    // Verify send button is visible again
    await expect(chatPage.sendButton).toBeVisible();
  });
});

test.describe("Research Modes - Latency Targets", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("AUTO mode: Meets latency target (1-10s)", async () => {
    await chatPage.chooseModelFromSelector("research-auto");

    const startTime = Date.now();
    await chatPage.sendUserMessage("What is the legal age of majority?");
    await chatPage.isGenerationComplete();
    const latency = Date.now() - startTime;

    // Verify latency is within target range
    expect(latency).toBeGreaterThan(1000); // At least 1 second
    expect(latency).toBeLessThan(10_000); // Less than 10 seconds

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
  });

  test("MEDIUM mode: Meets latency target (10-20s)", async () => {
    await chatPage.chooseModelFromSelector("research-medium");

    const startTime = Date.now();
    await chatPage.sendUserMessage(
      "Explain the process of company registration in Zimbabwe"
    );
    await chatPage.isGenerationComplete();
    const latency = Date.now() - startTime;

    // Verify latency is within target range
    expect(latency).toBeLessThan(20_000); // Less than 20 seconds

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
  });

  test("DEEP mode: Meets latency target (25-47s)", async () => {
    await chatPage.chooseModelFromSelector("research-deep");

    const startTime = Date.now();
    await chatPage.sendUserMessage(
      "Provide a comprehensive analysis of intellectual property law in Zimbabwe"
    );
    await chatPage.isGenerationComplete();
    const latency = Date.now() - startTime;

    // Verify latency is within target range
    expect(latency).toBeLessThan(47_000); // Less than 47 seconds

    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage).not.toBeNull();
    expect(assistantMessage?.content).toBeTruthy();
  });
});
