/**
 * Mastra Tools Index
 *
 * Central export for all Mastra-compatible tools.
 * All agents have access to all tools as per requirements 11.1-11.8.
 */

import { advancedSearchWorkflowTool } from "./advanced-search-workflow-tool";
import { createDocumentTool } from "./create-document";
import { getWeatherTool } from "./get-weather";
import { requestSuggestionsTool } from "./request-suggestions";
import { summarizeContentTool } from "./summarize-content";
import { tavilyContextSearchTool } from "./tavily-context-search";
import { tavilyExtractTool } from "./tavily-extract";
import { tavilyNewsSearchTool } from "./tavily-news-search";
import { tavilyQnaTool } from "./tavily-qna";
import { tavilyQnaDirectTool } from "./tavily-qna-direct";
import { tavilySearchTool } from "./tavily-search";
import { tavilySearchAdvancedTool } from "./tavily-search-advanced";
import { updateDocumentTool } from "./update-document";

/**
 * All available tools for Mastra agents
 *
 * Requirements:
 * - 11.1: tavilySearch, tavilyAdvancedSearch, tavilyQna
 * - 11.2: tavilyExtract
 * - 11.3: createDocument
 * - 11.4: updateDocument
 * - 11.5: requestSuggestions
 * - 11.6: summarizeContent
 * - 11.7: getWeather
 * - 11.8: All agents have access to all tools
 */
export const allMastraTools = {
  advancedSearchWorkflow: advancedSearchWorkflowTool,
  tavilySearch: tavilySearchTool,
  tavilySearchAdvanced: tavilySearchAdvancedTool,
  tavilyQna: tavilyQnaTool,
  tavilyQnaDirect: tavilyQnaDirectTool,
  tavilyContextSearch: tavilyContextSearchTool,
  tavilyNewsSearch: tavilyNewsSearchTool,
  tavilyExtract: tavilyExtractTool,
  createDocument: createDocumentTool,
  updateDocument: updateDocumentTool,
  requestSuggestions: requestSuggestionsTool,
  summarizeContent: summarizeContentTool,
  getWeather: getWeatherTool,
};

/**
 * Get all tools as an object for agent configuration
 */
export function getAllTools() {
  return allMastraTools;
}
