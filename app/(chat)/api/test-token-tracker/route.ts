import { NextResponse } from "next/server";
import {
  checkDailyLimit,
  dailyTokenTracker,
  getDailyTokenUsage,
  incrementDailyTokenUsage,
} from "@/lib/token-tracker";

export async function GET() {
  try {
    // Get current usage
    const currentUsage = await getDailyTokenUsage();

    // Get detailed stats
    const stats = await dailyTokenTracker.getUsageStats();

    // Check if we can add 2500 tokens
    const canAdd2500 = await checkDailyLimit(2500);

    // Check if we can add 900K tokens (should fail)
    const canAdd900K = await checkDailyLimit(900_000);

    return NextResponse.json({
      success: true,
      currentUsage,
      stats,
      checks: {
        canAdd2500,
        canAdd900K,
      },
    });
  } catch (error) {
    console.error("[Token Tracker Test Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { tokens } = await request.json();

    if (!tokens || typeof tokens !== "number" || tokens <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid tokens parameter. Must be a positive number.",
        },
        { status: 400 }
      );
    }

    // Check if we can add these tokens
    const canAdd = await checkDailyLimit(tokens);

    if (!canAdd) {
      const stats = await dailyTokenTracker.getUsageStats();
      return NextResponse.json(
        {
          success: false,
          error: "Would exceed daily token limit",
          stats,
        },
        { status: 429 }
      );
    }

    // Increment the usage
    const newTotal = await incrementDailyTokenUsage(tokens);

    // Get updated stats
    const stats = await dailyTokenTracker.getUsageStats();

    return NextResponse.json({
      success: true,
      tokensAdded: tokens,
      newTotal,
      stats,
    });
  } catch (error) {
    console.error("[Token Tracker Test Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
