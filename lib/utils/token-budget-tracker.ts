/**
 * Token Budget Tracker
 *
 * Monitors token usage throughout workflow execution and provides
 * intelligent recommendations for summarization and optimization.
 */

export interface TokenUsageStep {
  step: string;
  tokens: number;
  timestamp: number;
  truncated?: boolean;
}

export interface TokenBudgetReport {
  totalBudget: number;
  totalUsed: number;
  remaining: number;
  utilization: number;
  steps: TokenUsageStep[];
  shouldSummarize: boolean;
  recommendations: string[];
}

export class TokenBudgetTracker {
  private budget: number;
  private used = 0;
  private steps: TokenUsageStep[] = [];
  private summarizationThreshold: number;

  constructor(budget: number, summarizationThreshold = 0.7) {
    this.budget = budget;
    this.summarizationThreshold = summarizationThreshold;
  }

  /**
   * Add token usage for a workflow step
   */
  addUsage(step: string, tokens: number, truncated = false): void {
    this.used += tokens;
    this.steps.push({
      step,
      tokens,
      timestamp: Date.now(),
      truncated,
    });

    console.log(`[Token Budget] ${step}: ${tokens} tokens`, {
      totalUsed: this.used,
      budget: this.budget,
      utilization: `${(this.getUtilization() * 100).toFixed(1)}%`,
      truncated,
    });
  }

  /**
   * Get remaining token budget
   */
  getRemaining(): number {
    return Math.max(0, this.budget - this.used);
  }

  /**
   * Get current utilization as a percentage (0-1)
   */
  getUtilization(): number {
    return this.used / this.budget;
  }

  /**
   * Check if summarization should be triggered
   */
  shouldSummarize(customThreshold?: number): boolean {
    const threshold = customThreshold ?? this.summarizationThreshold;
    return this.getUtilization() > threshold;
  }

  /**
   * Check if any steps had truncated content
   */
  hasTruncation(): boolean {
    return this.steps.some((s) => s.truncated);
  }

  /**
   * Get the step with the highest token usage
   */
  getHighestUsageStep(): TokenUsageStep | undefined {
    return this.steps.reduce((max, step) =>
      step.tokens > (max?.tokens || 0) ? step : max
    );
  }

  /**
   * Calculate potential token savings from summarization
   */
  estimateSummarizationSavings(compressionRatio = 0.5): number {
    // Estimate savings by compressing the highest usage steps
    const sortedSteps = [...this.steps].sort((a, b) => b.tokens - a.tokens);
    const topSteps = sortedSteps.slice(0, 2); // Compress top 2 steps

    const savings = topSteps.reduce(
      (sum, step) => sum + step.tokens * (1 - compressionRatio),
      0
    );

    return Math.floor(savings);
  }

  /**
   * Get intelligent recommendations based on usage patterns
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const utilization = this.getUtilization();

    // High utilization warnings
    if (utilization > 0.9) {
      recommendations.push(
        "⚠️  CRITICAL: Token budget at 90%+ utilization. Immediate summarization recommended."
      );
    } else if (utilization > 0.7) {
      recommendations.push(
        "⚠️  WARNING: Token budget at 70%+ utilization. Consider summarization before next step."
      );
    }

    // Truncation warnings
    if (this.hasTruncation()) {
      const truncatedSteps = this.steps
        .filter((s) => s.truncated)
        .map((s) => s.step);
      recommendations.push(
        `⚠️  Content truncation detected in: ${truncatedSteps.join(
          ", "
        )}. Information may be lost.`
      );
    }

    // Budget exceeded
    if (this.used > this.budget) {
      recommendations.push(
        `❌ ERROR: Token budget exceeded by ${
          this.used - this.budget
        } tokens. Workflow may fail.`
      );
    }

    // Optimization opportunities
    const highestStep = this.getHighestUsageStep();
    if (highestStep && highestStep.tokens > this.budget * 0.4) {
      recommendations.push(
        `💡 TIP: Step "${highestStep.step}" uses ${
          highestStep.tokens
        } tokens (${((highestStep.tokens / this.budget) * 100).toFixed(
          1
        )}% of budget). Consider summarization.`
      );
    }

    // Potential savings
    const savings = this.estimateSummarizationSavings();
    if (savings > 1000) {
      recommendations.push(
        `💰 OPPORTUNITY: Summarization could save ~${savings} tokens (${(
          (savings / this.budget) *
          100
        ).toFixed(1)}% of budget).`
      );
    }

    // All good
    if (recommendations.length === 0 && utilization < 0.7) {
      recommendations.push(
        `✅ Token usage is healthy (${(utilization * 100).toFixed(
          1
        )}%). No action needed.`
      );
    }

    return recommendations;
  }

  /**
   * Generate a comprehensive report
   */
  getReport(): TokenBudgetReport {
    return {
      totalBudget: this.budget,
      totalUsed: this.used,
      remaining: this.getRemaining(),
      utilization: this.getUtilization(),
      steps: [...this.steps],
      shouldSummarize: this.shouldSummarize(),
      recommendations: this.getRecommendations(),
    };
  }

  /**
   * Log a formatted report to console
   */
  logReport(): void {
    const report = this.getReport();

    console.log("═".repeat(80));
    console.log("📊 TOKEN BUDGET REPORT");
    console.log("═".repeat(80));
    console.log(
      `Budget: ${report.totalUsed}/${report.totalBudget} tokens (${(
        report.utilization * 100
      ).toFixed(1)}% used)`
    );
    console.log(`Remaining: ${report.remaining} tokens`);
    console.log("");
    console.log("Steps:");
    for (const step of report.steps) {
      const truncatedFlag = step.truncated ? " [TRUNCATED]" : "";
      console.log(`  • ${step.step}: ${step.tokens} tokens${truncatedFlag}`);
    }
    console.log("");
    console.log("Recommendations:");
    for (const rec of report.recommendations) {
      console.log(`  ${rec}`);
    }
    console.log("═".repeat(80));
  }

  /**
   * Reset the tracker for a new workflow run
   */
  reset(): void {
    this.used = 0;
    this.steps = [];
  }

  /**
   * Update the budget (useful for adaptive allocation)
   */
  updateBudget(newBudget: number): void {
    console.log(`[Token Budget] Budget updated: ${this.budget} → ${newBudget}`);
    this.budget = newBudget;
  }
}

/**
 * Create a token budget tracker with default settings
 */
export function createTokenBudgetTracker(
  budget: number,
  summarizationThreshold?: number
): TokenBudgetTracker {
  return new TokenBudgetTracker(budget, summarizationThreshold);
}
