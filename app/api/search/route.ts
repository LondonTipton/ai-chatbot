import { type NextRequest, NextResponse } from "next/server";
import { SearchService } from "@/lib/search/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, topK, filters } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Create service instance with config
    const searchService = new SearchService({
      modalWebhookUrl: process.env.MODAL_EMBEDDING_URL!,
      zillizUri: process.env.ZILLIZ_URI!,
      zillizToken: process.env.ZILLIZ_TOKEN!,
      zillizCollection: process.env.ZILLIZ_COLLECTION!,
    });

    const results = await searchService.search(query, topK, filters);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);

    // Handle cold start / warmup errors
    if (
      error instanceof Error &&
      (error.message.includes("warming up") ||
        error.message.includes("timeout"))
    ) {
      return NextResponse.json(
        {
          error: error.message,
          isWarmup: true,
          suggestion:
            "The embedding service is starting up. Please try again in 30-60 seconds.",
        },
        { status: 503 } // Service Unavailable
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
