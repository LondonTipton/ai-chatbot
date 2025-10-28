import { expect, test } from "@playwright/test";
import { generateId } from "ai";
import {
  type LoginActionState,
  login,
  logout,
  type RegisterActionState,
  register,
} from "@/app/(auth)/actions";
import { clearSessionCookie } from "@/lib/appwrite/session";
import { getUser } from "@/lib/db/queries";

test.describe("Authentication Server Actions", () => {
  let testEmail: string;
  let testPassword: string;

  test.beforeAll(() => {
    testEmail = `test-${generateId()}@example.com`;
    testPassword = generateId();
  });

  test.describe("register", () => {
    test("should register new user successfully", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", testPassword);

      const initialState: RegisterActionState = { status: "idle" };
      const result = await register(initialState, formData);

      expect(result.status).toBe("success");
      expect(result.error).toBeUndefined();

      // Verify user exists in database
      const [user] = await getUser(testEmail);
      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.appwriteId).toBeDefined();
      expect(user.isGuest).toBe(false);
    });

    test("should fail with existing email", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", testPassword);

      const initialState: RegisterActionState = { status: "idle" };
      const result = await register(initialState, formData);

      expect(result.status).toBe("user_exists");
      expect(result.error).toContain("already exists");
    });

    test("should fail with invalid email", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", testPassword);

      const initialState: RegisterActionState = { status: "idle" };
      const result = await register(initialState, formData);

      expect(result.status).toBe("invalid_data");
      expect(result.error).toBeDefined();
    });

    test("should fail with short password", async () => {
      const formData = new FormData();
      formData.append("email", `test-${generateId()}@example.com`);
      formData.append("password", "123");

      const initialState: RegisterActionState = { status: "idle" };
      const result = await register(initialState, formData);

      expect(result.status).toBe("invalid_data");
      expect(result.error).toBeDefined();
    });
  });

  test.describe("login", () => {
    test("should login with valid credentials", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", testPassword);

      const initialState: LoginActionState = { status: "idle" };
      const result = await login(initialState, formData);

      expect(result.status).toBe("success");
      expect(result.error).toBeUndefined();
    });

    test("should fail with invalid email", async () => {
      const formData = new FormData();
      formData.append("email", "nonexistent@example.com");
      formData.append("password", testPassword);

      const initialState: LoginActionState = { status: "idle" };
      const result = await login(initialState, formData);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Invalid email or password");
    });

    test("should fail with invalid password", async () => {
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", "wrongpassword");

      const initialState: LoginActionState = { status: "idle" };
      const result = await login(initialState, formData);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Invalid email or password");
    });

    test("should fail with invalid data format", async () => {
      const formData = new FormData();
      formData.append("email", "invalid-email");
      formData.append("password", testPassword);

      const initialState: LoginActionState = { status: "idle" };
      const result = await login(initialState, formData);

      expect(result.status).toBe("invalid_data");
      expect(result.error).toBeDefined();
    });
  });

  test.describe("logout", () => {
    test("should logout successfully", async () => {
      // First login to get a session
      const formData = new FormData();
      formData.append("email", testEmail);
      formData.append("password", testPassword);

      const initialState: LoginActionState = { status: "idle" };
      await login(initialState, formData);

      // Then logout
      await expect(logout()).resolves.not.toThrow();
    });

    test("should handle logout without active session", async () => {
      await clearSessionCookie();
      await expect(logout()).resolves.not.toThrow();
    });
  });
});
