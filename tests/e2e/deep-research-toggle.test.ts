import { expect, test } from "@playwright/test";
import { ChatPage } from "../pages/chat";

// This E2E verifies the Deep Research toggle updates immediately and is sent in the next request

test.describe("Deep Research Toggle", () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test("label click reflects state immediately", async ({ page }) => {
    // Ensure badge is not visible initially
    await chatPage.expectDeepResearchOnBadgeVisible(false);

    // Click the label; badge should appear immediately (no typing required)
    await chatPage.toggleDeepResearchViaLabel();
    await chatPage.expectDeepResearchOnBadgeVisible(true);

    // Click again to turn OFF; badge should disappear immediately
    await chatPage.toggleDeepResearchViaLabel();
    await chatPage.expectDeepResearchOnBadgeVisible(false);
  });

  test("switch toggles and next request includes correct flag", async ({
    page,
  }) => {
    // Turn ON via switch
    await chatPage.toggleDeepResearchViaSwitch();
    await chatPage.expectDeepResearchOnBadgeVisible(true);

    // Intercept the next /api/chat request and validate payload
    const reqPromise = page.waitForRequest(
      (req) => req.url().includes("/api/chat") && req.method() === "POST"
    );

    await chatPage.sendUserMessage("Test deep research routing");
    const req = await reqPromise;

    const postData = req.postDataJSON();
    expect(postData.comprehensiveWorkflowEnabled).toBe(true);

    // Now toggle OFF and check again
    await chatPage.toggleDeepResearchViaSwitch();
    await chatPage.expectDeepResearchOnBadgeVisible(false);

    const reqPromise2 = page.waitForRequest(
      (r) => r.url().includes("/api/chat") && r.method() === "POST"
    );

    await chatPage.sendUserMessage("Test deep research routing OFF");
    const req2 = await reqPromise2;

    const postData2 = req2.postDataJSON();
    expect(postData2.comprehensiveWorkflowEnabled ?? false).toBe(false);
  });
});
