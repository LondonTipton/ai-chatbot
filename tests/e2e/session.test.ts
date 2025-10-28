import { expect, test } from "../fixtures";
import { generateRandomTestUser } from "../helpers";
import { AuthPage } from "../pages/auth";

test.describe
  .serial("Unauthenticated Access", () => {
    test("Redirect to login when accessing root without session", async ({
      page,
    }) => {
      const response = await page.goto("/");

      if (!response) {
        throw new Error("Failed to load page");
      }

      // Should be redirected to login page
      await page.waitForURL("/login");
      await expect(page).toHaveURL("/login");
    });

    test("Redirect to login when accessing chat route without session", async ({
      page,
    }) => {
      await page.goto("/chat/test-chat-id");

      // Should be redirected to login page with returnUrl
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login\?returnUrl=/);
    });

    test("Allow accessing login page without session", async ({ page }) => {
      await page.goto("/login");
      await page.waitForURL("/login");
      await expect(page).toHaveURL("/login");
    });

    test("Allow accessing register page without session", async ({ page }) => {
      await page.goto("/register");
      await page.waitForURL("/register");
      await expect(page).toHaveURL("/register");
    });

    test("Preserve returnUrl in login redirect", async ({ page }) => {
      await page.goto("/chat/my-chat");

      // Should redirect to login with returnUrl parameter
      await page.waitForURL(/\/login/);
      const url = new URL(page.url());
      expect(url.searchParams.get("returnUrl")).toBe("/chat/my-chat");
    });
  });

test.describe
  .serial("New User Registration and Login", () => {
    let authPage: AuthPage;
    const testUser = generateRandomTestUser();

    test.beforeEach(({ page }) => {
      authPage = new AuthPage(page);
    });

    test("Register new account and automatically log in", async ({ page }) => {
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain("Account created successfully!");

      // Should be automatically logged in and redirected to chat
      await page.waitForURL("/");
      await expect(page.getByPlaceholder("Send a message...")).toBeVisible();
    });

    test("Fail to register with existing email", async () => {
      await authPage.register(testUser.email, testUser.password);
      await authPage.expectToastToContain("Account already exists!");
    });

    test("Log into existing account", async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);

      await page.waitForURL("/");
      await expect(page.getByPlaceholder("Send a message...")).toBeVisible();
    });

    test("Display user email in user menu", async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);

      await page.waitForURL("/");
      await expect(page.getByPlaceholder("Send a message...")).toBeVisible();

      authPage.openSidebar();
      const userEmail = await page.getByTestId("user-email");
      await expect(userEmail).toHaveText(testUser.email);
    });

    test("Redirect to returnUrl after login", async ({ page }) => {
      // First, try to access a protected route
      await page.goto("/chat/test-chat");
      await page.waitForURL(/\/login/);

      // Verify returnUrl is preserved
      const url = new URL(page.url());
      expect(url.searchParams.get("returnUrl")).toBe("/chat/test-chat");

      // Now login
      await page.getByPlaceholder("user@acme.com").fill(testUser.email);
      await page.getByLabel("Password").fill(testUser.password);
      await page.getByRole("button", { name: "Sign In" }).click();

      // Should redirect back to the original URL
      await page.waitForURL("/chat/test-chat");
      await expect(page).toHaveURL("/chat/test-chat");
    });

    test("Log out redirects to login page", async ({ page }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL("/");

      authPage.openSidebar();

      const userNavButton = page.getByTestId("user-nav-button");
      await expect(userNavButton).toBeVisible();

      await userNavButton.click();
      const userNavMenu = page.getByTestId("user-nav-menu");
      await expect(userNavMenu).toBeVisible();

      const authMenuItem = page.getByTestId("user-nav-item-auth");
      await expect(authMenuItem).toContainText("Sign out");

      await authMenuItem.click();

      // Should redirect to login page after logout
      await page.waitForURL("/login");
      await expect(page).toHaveURL("/login");
    });

    test("Redirect authenticated users away from login page", async ({
      page,
    }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL("/");

      await page.goto("/login");
      await expect(page).toHaveURL("/");
    });

    test("Redirect authenticated users away from register page", async ({
      page,
    }) => {
      await authPage.login(testUser.email, testUser.password);
      await page.waitForURL("/");

      await page.goto("/register");
      await expect(page).toHaveURL("/");
    });
  });

test.describe
  .serial("Returning User Automatic Login", () => {
    test("Automatically log in returning user with valid session", async ({
      adaContext,
    }) => {
      const response = await adaContext.page.goto("/");

      if (!response) {
        throw new Error("Failed to load page");
      }

      // Should not redirect - user should be automatically logged in
      let request = response.request();
      const chain: string[] = [];

      while (request) {
        chain.unshift(request.url());
        request = request.redirectedFrom();
      }

      // No redirects - direct access to home page
      expect(chain).toEqual(["http://localhost:3000/"]);

      // Verify chat interface is accessible
      await expect(
        adaContext.page.getByPlaceholder("Send a message...")
      ).toBeVisible();
    });

    test("Maintain session across page navigation", async ({ adaContext }) => {
      await adaContext.page.goto("/");
      await expect(
        adaContext.page.getByPlaceholder("Send a message...")
      ).toBeVisible();

      // Navigate to a chat route
      await adaContext.page.goto("/chat/test-chat");
      await expect(
        adaContext.page.getByPlaceholder("Send a message...")
      ).toBeVisible();

      // User should still be authenticated
      const sidebarToggleButton = adaContext.page.getByTestId(
        "sidebar-toggle-button"
      );
      await sidebarToggleButton.click();

      const userNavButton = adaContext.page.getByTestId("user-nav-button");
      await expect(userNavButton).toBeVisible();
    });
  });
