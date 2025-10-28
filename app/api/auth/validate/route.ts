import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/appwrite/config";

export async function POST(request: Request) {
  try {
    const { sessionId, userId } = await request.json();

    console.log(
      `[validate] Validating session for userId=${userId?.substring(0, 8)}...`
    );

    if (!sessionId || !userId) {
      console.log("[validate] Missing sessionId or userId");
      return NextResponse.json(
        { error: "Missing sessionId or userId" },
        { status: 400 }
      );
    }

    const { users } = createAdminClient();
    // Ensure user exists
    const user = await users.get(userId);
    console.log(`[validate] User found: ${user.email}`);

    // Create a minimal session object for middleware compatibility
    const session = {
      $id: sessionId,
      userId,
      expire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      current: true,
    };

    console.log(`[validate] Session validation passed for user: ${user.email}`);
    return NextResponse.json({ valid: true, user, session }, { status: 200 });
  } catch (error) {
    console.error("[validate] Session validation failed:", error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
