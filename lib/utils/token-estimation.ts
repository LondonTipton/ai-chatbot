/**
 * Token Estimation Utilities
 *
 * Provides utilities for estimating token counts and managing token budgets
 */

/**
 * Estimate token count from text
 * Rule of thumb: ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

/**
 * Check if content should be summarized based on token threshold
 */
export function shouldSummarize(
  totalTokens: number,
  threshold = 50_000
): boolean {
  return totalTokens > threshold;
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(
  originalTokens: number,
  compressedTokens: number
): number {
  if (originalTokens === 0) {
    return 1.0;
  }
  return compressedTokens / originalTokens;
}

/**
 * Format token count for logging
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${tokens}`;
}

/**
 * Token Budget Tracker
 * Tracks token usage across workflow steps
 */
export class TokenBudgetTracker {
  private readonly budget: number;
  private used = 0;
  private readonly steps: Array<{
    step: string;
    tokens: number;
    timestamp: number;
  }> = [];

  constructor(budget: number) {
    this.budget = budget;
  }

  addUsage(step: string, tokens: number): void {
    this.used += tokens;
    this.steps.push({
      step,
      tokens,
      timestamp: Date.now(),
    });
  }

  getRemaining(): number {
    return Math.max(0, this.budget - this.used);
  }

  getUtilization(): number {
    return this.used / this.budget;
  }

  shouldSummarize(threshold = 0.7): boolean {
    return this.getUtilization() > threshold;
  }

  getReport(): string {
    const utilizationPercent = (this.getUtilization() * 100).toFixed(1);

    return `Token Budget Report:
  Total Budget: ${formatTokenCount(this.budget)}
  Used: ${formatTokenCount(this.used)} (${utilizationPercent}%)
  Remaining: ${formatTokenCount(this.getRemaining())}
  
  Steps:
${this.steps
  .map((s) => `    - ${s.step}: ${formatTokenCount(s.tokens)}`)
  .join("\n")}`;
  }

  getSummary(): {
    budget: number;
    used: number;
    remaining: number;
    utilization: number;
    steps: Array<{ step: string; tokens: number }>;
  } {
    return {
      budget: this.budget,
      used: this.used,
      remaining: this.getRemaining(),
      utilization: this.getUtilization(),
      steps: this.steps.map(({ step, tokens }) => ({ step, tokens })),
    };
  }
}
