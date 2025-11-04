import { NextResponse } from "next/server";
import { Client } from "node-appwrite";
import { createLogger } from "@/lib/logger";

const logger = createLogger("test-appwrite/route");

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;

    logger.log("Testing Appwrite connection...");
    logger.log("Endpoint:", endpoint);
    logger.log("Project ID:", projectId);
    logger.log("API Key present:", !!apiKey);

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
    logger.error("Appwrite connection test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
