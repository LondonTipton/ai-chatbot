import { NextResponse } from "next/server";
import { Client } from "node-appwrite";

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;

    console.log("Testing Appwrite connection...");
    console.log("Endpoint:", endpoint);
    console.log("Project ID:", projectId);
    console.log("API Key present:", !!apiKey);

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing environment variables",
          details: {
            hasEndpoint: !!endpoint,
            hasProjectId: !!projectId,
            hasApiKey: !!apiKey,
          },
        },
        { status: 500 }
      );
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    // Try to make a simple API call
    const response = await fetch(`${endpoint}/health`, {
      headers: {
        "X-Appwrite-Project": projectId,
        "X-Appwrite-Key": apiKey,
      },
    });

    const health = await response.json();

    return NextResponse.json({
      success: true,
      message: "Appwrite connection successful",
      config: {
        endpoint,
        projectId,
        apiKeyLength: apiKey.length,
      },
      health,
    });
  } catch (error) {
    console.error("Appwrite connection test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
