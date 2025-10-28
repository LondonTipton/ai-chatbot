import { NextResponse } from "next/server";
import { auth } from "@/lib/appwrite/server-auth";
import { getUserByAppwriteId } from "@/lib/db/queries";
import { getUserUsage } from "@/lib/db/usage";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getUserByAppwriteId(session.user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const usage = await getUserUsage(dbUser.id);

    return NextResponse.json({
      requestsToday: usage.requestsToday,
      dailyLimit: usage.dailyLimit,
      plan: usage.plan,
      remaining: usage.dailyLimit - usage.requestsToday,
      percentage: (usage.requestsToday / usage.dailyLimit) * 100,
    });
  } catch (error) {
    console.error("[Usage API] Error:", error);
    return NextResponse.json({ error: "Failed to get usage" }, { status: 500 });
  }
}
