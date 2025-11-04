import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/config";
import { handleAppwriteError } from "@/lib/appwrite/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("reset-password/route");

export async function POST(request: Request) {
  try {
    const { userId, secret, password } = await request.json();

    // Validate input
    if (!userId || !secret || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const { account } = createAdminClient();

    // Complete the password recovery using Appwrite
    await account.updateRecovery(userId, secret, password);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    const authError = handleAppwriteError(error);
    logger.error("[RESET_PASSWORD] Error:", authError);

    return NextResponse.json(
      {
        error: authError.message || "Failed to reset password",
      },
      { status: 500 }
    );
  }
}
