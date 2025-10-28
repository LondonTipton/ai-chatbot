import { expect, test } from "@playwright/test";
import { generateId } from "ai";
import {
  createAccount,
  createEmailSession,
  deleteSession,
  getCurrentUser,
} from "@/lib/appwrite/auth";
import { AuthErrorCode } from "@/lib/appwrite/errors";

test.describe("Authentication Service", () => {
  let testEmail: string;
  let testPassword: string;
  let testSessionId: string;

  test.beforeAll(() => {
    testEmail = `test-${generateId()}@example.com`;
    testPassword = generateId();
  });

  test.afterAll(async () => {
    // Cleanup: delete test sessions
    if (testSessionId) {
      try {
        await deleteSession(testSessionId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  test.describe("createAccount", () => {
    test("should create account with valid data", async () => {
      const user = await createAccount(testEmail, testPassword);

      expect(user).toBeDefined();
      expect(user.$id).toBeDefined();
      expect(user.email).toBe(testEmail);
    });

    test("should fail with duplicate email", async () => {
      try {
        await createAccount(testEmail, testPassword);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.USER_EXISTS);
      }
    });

    test("should fail with invalid email", async () => {
      try {
        await createAccount("invalid-email", testPassword);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_INPUT);
      }
    });

    test("should fail with short password", async () => {
      try {
        await createAccount(`test-${generateId()}@example.com`, "123");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_INPUT);
      }
    });
  });

  test.describe("createEmailSession", () => {
    test("should create session with valid credentials", async () => {
      const session = await createEmailSession(testEmail, testPassword);

      expect(session).toBeDefined();
      expect(session.$id).toBeDefined();
      expect(session.userId).toBeDefined();
      expect(session.provider).toBe("email");

      testSessionId = session.$id;
    });

    test("should fail with invalid email", async () => {
      try {
        await createEmailSession("nonexistent@example.com", testPassword);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      }
    });

    test("should fail with invalid password", async () => {
      try {
        await createEmailSession(testEmail, "wrongpassword");
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      }
    });
  });

  test.describe("getCurrentUser", () => {
    test("should get current user with valid session", async () => {
      const user = await getCurrentUser(testSessionId);

      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
    });

    test("should return null with invalid session", async () => {
      const user = await getCurrentUser("invalid-session-id");

      expect(user).toBeNull();
    });
  });

  test.describe("deleteSession", () => {
    test("should delete valid session", async () => {
      const session = await createEmailSession(testEmail, testPassword);
      await deleteSession(session.$id);

      // Verify session is deleted by trying to get user
      const user = await getCurrentUser(session.$id);
      expect(user).toBeNull();
    });

    test("should handle deleting non-existent session", async () => {
      try {
        await deleteSession("non-existent-session");
        // May or may not throw depending on Appwrite behavior
      } catch (error: any) {
        expect(error.code).toBeDefined();
      }
    });
  });

  test.describe("error handling", () => {
    test("should not retry on authentication errors", async () => {
      const startTime = Date.now();

      try {
        await createEmailSession("invalid@example.com", "wrongpassword");
      } catch (error: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should fail quickly without retries (< 1 second)
        expect(duration).toBeLessThan(1000);
        expect(error.code).toBe(AuthErrorCode.INVALID_CREDENTIALS);
      }
    });
  });
});
