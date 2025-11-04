import { describe, expect, it } from "vitest";
import { getAllTools } from "../../mastra/tools";

describe("Mastra Tools Integration", () => {
  it("should export all required tools", () => {
    const tools = getAllTools();

    // Verify all tools are present (Requirement 11.8)
    expect(tools).toHaveProperty("tavilySearch");
    expect(tools).toHaveProperty("tavilySearchAdvanced");
    expect(tools).toHaveProperty("tavilyQna");
    expect(tools).toHaveProperty("tavilyExtract");
    expect(tools).toHaveProperty("createDocument");
    expect(tools).toHaveProperty("updateDocument");
    expect(tools).toHaveProperty("requestSuggestions");
    expect(tools).toHaveProperty("summarizeContent");
    expect(tools).toHaveProperty("getWeather");
  });

  it("should have correct tool IDs", () => {
    const tools = getAllTools();

    expect(tools.tavilySearch.id).toBe("tavily-search");
    expect(tools.tavilySearchAdvanced.id).toBe("tavily-search-advanced");
    expect(tools.tavilyQna.id).toBe("tavily-qna");
    expect(tools.tavilyExtract.id).toBe("tavily-extract");
    expect(tools.createDocument.id).toBe("create-document");
    expect(tools.updateDocument.id).toBe("update-document");
    expect(tools.requestSuggestions.id).toBe("request-suggestions");
    expect(tools.summarizeContent.id).toBe("summarize-content");
    expect(tools.getWeather.id).toBe("get-weather");
  });

  it("should have descriptions for all tools", () => {
    const tools = getAllTools();

    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("should have input schemas for all tools", () => {
    const tools = getAllTools();

    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("should have output schemas for all tools", () => {
    const tools = getAllTools();

    for (const [name, tool] of Object.entries(tools)) {
      expect(tool.outputSchema).toBeDefined();
    }
  });
});
