import { NextResponse } from "next/server";
import { getGeminiBalancer } from "@/lib/ai/gemini-key-balancer";

/**
 * API endpoint to view Gemini API key usage statistics
 * GET /api/admin/gemini-stats
 */
export async function GET() {
  try {
    const balancer = getGeminiBalancer();
    const stats = balancer.getStats();
    const keyCount = balancer.getKeyCount();

    return NextResponse.json({
      success: true,
      keyCount,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
