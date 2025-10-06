import { NextResponse } from "next/server";

/**
 * Test endpoint to verify Tavily API integration
 * GET /api/test/tavily
 */
export async function GET() {
  const apiKey = process.env.TAVILY_API_KEY;

  // Check if API key is configured
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "TAVILY_API_KEY not configured",
        message:
          "Please add TAVILY_API_KEY to your .env.local file and restart the server",
      },
      { status: 500 }
    );
  }

  // Verify API key format
  if (!apiKey.startsWith("tvly-")) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid API key format",
        message: 'Tavily API keys should start with "tvly-"',
      },
      { status: 500 }
    );
  }

  try {
    // Perform a test search
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: "Zimbabwe legal system test",
        max_results: 2,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Tavily API returned ${response.status}`,
          details: errorText,
          message:
            response.status === 401
              ? "Invalid API key - please check your key at tavily.com/dashboard"
              : response.status === 429
              ? "Rate limit exceeded - check your usage at tavily.com/dashboard"
              : "API request failed - check Tavily service status",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "✅ Tavily API is working correctly!",
      testQuery: data.query,
      resultCount: data.results?.length || 0,
      responseTime: data.response_time,
      sampleResult: data.results?.[0]
        ? {
            title: data.results[0].title,
            url: data.results[0].url,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Tavily API",
        details: error instanceof Error ? error.message : "Unknown error",
        message:
          "Check your internet connection and verify Tavily service status",
      },
      { status: 500 }
    );
  }
}
