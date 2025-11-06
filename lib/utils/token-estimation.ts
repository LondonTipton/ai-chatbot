/**
 * Token Estimation Utilities
 *
 * Provides functions to estimate token usage for LLM operations.
 * Uses the rough approximation: 1 token ≈ 4 characters
 */

/**
 * Estimates the number of tokens in a given text or object.
 *
 * @param text - The text string or object to estimate tokens for
 * @returns Estimated number of tokens
 *
 * @example
 * estimateTokens("Hello world") // Returns ~3 tokens
 * estimateTokens({ key: "value" }) // Returns ~4 tokens
 */
export function estimateTokens(text: string | object): number {
  let content: string;

  if (typeof text === "object") {
    content = JSON.stringify(text);
  } else {
    content = text;
  }

  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(content.length / 4);
}

/**
 * Represents a search result from Tavily or similar search APIs
 */
type SearchResult = {
  title?: string;
  content?: string;
  url?: string;
  score?: number;
  publishedDate?: string;
  [key: string]: any;
};

/**
 * Estimates the total number of tokens in an array of search results.
 *
 * @param results - Array of search results
 * @returns Estimated total tokens across all results
 *
 * @example
 * const results = [
 *   { title: "Result 1", content: "Some content..." },
 *   { title: "Result 2", content: "More content..." }
 * ];
 * estimateSearchResultTokens(results) // Returns estimated token count
 */
export function estimateSearchResultTokens(results: SearchResult[]): number {
  if (!results || results.length === 0) {
    return 0;
  }

  let totalTokens = 0;

  for (const result of results) {
    // Estimate tokens for each field
    if (result.title) {
      totalTokens += estimateTokens(result.title);
    }
    if (result.content) {
      totalTokens += estimateTokens(result.content);
    }
    if (result.url) {
      totalTokens += estimateTokens(result.url);
    }

    // Add small overhead for JSON structure (brackets, commas, etc.)
    totalTokens += 5;
  }

  return totalTokens;
}

/**
 * Token tracker for monitoring cumulative token usage during query execution
 */
export class TokenTracker {
  private cumulative = 0;
  private breakdown: Record<string, number> = {};

  /**
   * Adds tokens to the tracker for a specific component
   *
   * @param component - Name of the component (e.g., "search", "synthesis")
   * @param tokens - Number of tokens to add
   */
  add(component: string, tokens: number): void {
    this.cumulative += tokens;
    this.breakdown[component] = (this.breakdown[component] || 0) + tokens;
  }

  /**
   * Gets the total cumulative token count
   *
   * @returns Total tokens used
   */
  getTotal(): number {
    return this.cumulative;
  }

  /**
   * Gets the token breakdown by component
   *
   * @returns Object mapping component names to token counts
   */
  getBreakdown(): Record<string, number> {
    return { ...this.breakdown };
  }

  /**
   * Checks if the current usage exceeds a given budget
   *
   * @param budget - Token budget to check against
   * @returns True if budget is exceeded
   */
  exceedsBudget(budget: number): boolean {
    return this.cumulative > budget;
  }

  /**
   * Resets the tracker to zero
   */
  reset(): void {
    this.cumulative = 0;
    this.breakdown = {};
  }
}
