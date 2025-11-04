/**
 * Mastra Performance Metrics
 *
 * Tracks and logs performance metrics for Mastra workflows and agents.
 * Provides insights into execution time, success rates, and performance degradation.
 *
 * Requirements:
 * - 10.1: Log workflow execution time
 * - 10.2: Log number of sub-agents used
 * - 10.3: Track success rate per workflow type
 * - 10.4: Log warnings when performance degrades
 *
 * Usage:
 * ```typescript
 * const tracker = new MastraMetricsTracker("deep-research");
 * tracker.recordStart();
 * // ... execute workflow ...
 * tracker.recordComplete(result);
 * tracker.logMetrics();
 * ```
 */

import { createLogger } from "@/lib/logger";
import type { QueryComplexity } from "./complexity-detector";
import type { MastraResult } from "./mastra-router";

const logger = createLogger("ai/mastra-metrics");

/**
 * Metrics for a single Mastra workflow execution
 */
export interface MastraMetrics {
  /** Type of workflow or agent executed */
  workflowType: QueryComplexity;
  /** Total execution time in milliseconds */
  executionTime: number;
  /** Number of sub-agents used in the workflow */
  agentsUsed: number;
  /** Number of steps completed */
  stepsCompleted: number;
  /** Whether the workflow completed successfully */
  success: boolean;
  /** Whether fallback to AI SDK was used */
  fallbackUsed: boolean;
  /** Length of the response text */
  responseLength: number;
  /** Timestamp when the workflow started */
  startTime: number;
  /** Timestamp when the workflow completed */
  endTime: number;
  /** Optional error message if workflow failed */
  error?: string;
}

/**
 * Aggregated metrics for a workflow type
 */
export interface WorkflowTypeMetrics {
  /** Total number of executions */
  totalExecutions: number;
  /** Number of successful executions */
  successfulExecutions: number;
  /** Number of failed executions */
  failedExecutions: number;
  /** Success rate as a percentage (0-100) */
  successRate: number;
  /** Average execution time in milliseconds */
  avgExecutionTime: number;
  /** Minimum execution time in milliseconds */
  minExecutionTime: number;
  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;
  /** Average number of agents used */
  avgAgentsUsed: number;
  /** Average response length */
  avgResponseLength: number;
  /** Number of times fallback was used */
  fallbackCount: number;
  /** Last execution timestamp */
  lastExecution: number;
}

/**
 * Performance thresholds for warnings
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Maximum acceptable execution time in milliseconds */
  MAX_EXECUTION_TIME: {
    medium: 10_000, // 10 seconds for medium queries
    deep: 30_000, // 30 seconds for deep research
    "workflow-review": 25_000, // 25 seconds for document review
    "workflow-caselaw": 30_000, // 30 seconds for case law analysis
    "workflow-drafting": 35_000, // 35 seconds for legal drafting
  },
  /** Minimum acceptable success rate as percentage */
  MIN_SUCCESS_RATE: 90,
  /** Minimum acceptable response length */
  MIN_RESPONSE_LENGTH: 50,
  /** Maximum acceptable agents for a workflow */
  MAX_AGENTS: 3,
} as const;

/**
 * In-memory storage for workflow metrics
 * In production, this should be replaced with a persistent store
 */
class MetricsStore {
  private metrics: Map<QueryComplexity, MastraMetrics[]> = new Map();

  /**
   * Add a metric record
   */
  add(metric: MastraMetrics): void {
    const existing = this.metrics.get(metric.workflowType) || [];
    existing.push(metric);

    // Keep only last 100 records per workflow type to prevent memory issues
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(metric.workflowType, existing);
  }

  /**
   * Get all metrics for a workflow type
   */
  get(workflowType: QueryComplexity): MastraMetrics[] {
    return this.metrics.get(workflowType) || [];
  }

  /**
   * Get all workflow types with metrics
   */
  getWorkflowTypes(): QueryComplexity[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get total number of metrics stored
   */
  size(): number {
    let total = 0;
    for (const metrics of this.metrics.values()) {
      total += metrics.length;
    }
    return total;
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

/**
 * Tracker for a single workflow execution
 */
export class MastraMetricsTracker {
  private workflowType: QueryComplexity;
  private startTime = 0;
  private endTime = 0;
  private result?: MastraResult;
  private fallbackUsed = false;

  constructor(workflowType: QueryComplexity) {
    this.workflowType = workflowType;
  }

  /**
   * Record the start of workflow execution
   */
  recordStart(): void {
    this.startTime = Date.now();
    logger.log(`[Mastra Metrics] 📊 Starting ${this.workflowType} workflow`, {
      timestamp: new Date(this.startTime).toISOString(),
    });
  }

  /**
   * Record the completion of workflow execution
   */
  recordComplete(result: MastraResult): void {
    this.endTime = Date.now();
    this.result = result;

    const executionTime = this.endTime - this.startTime;

    logger.log(
      `[Mastra Metrics] ${result.success ? "✅" : "❌"} Completed ${
        this.workflowType
      } workflow`,
      {
        executionTime: `${executionTime}ms`,
        success: result.success,
        agentsUsed: result.agentsUsed || 0,
        responseLength: result.response.length,
      }
    );
  }

  /**
   * Record that fallback to AI SDK was used
   */
  recordFallback(): void {
    this.fallbackUsed = true;
    logger.log(
      `[Mastra Metrics] ⚠️ Fallback to AI SDK used for ${this.workflowType}`
    );
  }

  /**
   * Log metrics and store them
   */
  logMetrics(): void {
    if (!this.result) {
      logger.warn("[Mastra Metrics] ⚠️ Cannot log metrics: no result recorded");
      return;
    }

    const executionTime = this.endTime - this.startTime;

    const metrics: MastraMetrics = {
      workflowType: this.workflowType,
      executionTime,
      agentsUsed: this.result.agentsUsed || 0,
      stepsCompleted: this.result.steps?.length || 0,
      success: this.result.success,
      fallbackUsed: this.fallbackUsed,
      responseLength: this.result.response.length,
      startTime: this.startTime,
      endTime: this.endTime,
      error: this.result.success ? undefined : "Workflow execution failed",
    };

    // Store metrics
    metricsStore.add(metrics);

    // Log detailed metrics
    logger.log("[Mastra Metrics] 📈 Workflow Metrics:", {
      workflowType: metrics.workflowType,
      executionTime: `${metrics.executionTime}ms`,
      agentsUsed: metrics.agentsUsed,
      stepsCompleted: metrics.stepsCompleted,
      success: metrics.success,
      fallbackUsed: metrics.fallbackUsed,
      responseLength: metrics.responseLength,
    });

    // Check for performance warnings
    this.checkPerformanceWarnings(metrics);

    // Log aggregated metrics for this workflow type
    this.logAggregatedMetrics();
  }

  /**
   * Check for performance warnings
   */
  private checkPerformanceWarnings(metrics: MastraMetrics): void {
    const warnings: string[] = [];

    // Check execution time
    const maxTime =
      PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME[
        metrics.workflowType as keyof typeof PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME
      ];
    if (maxTime && metrics.executionTime > maxTime) {
      warnings.push(
        `Execution time (${metrics.executionTime}ms) exceeded threshold (${maxTime}ms)`
      );
    }

    // Check response length
    if (
      metrics.success &&
      metrics.responseLength < PERFORMANCE_THRESHOLDS.MIN_RESPONSE_LENGTH
    ) {
      warnings.push(
        `Response length (${metrics.responseLength}) below minimum (${PERFORMANCE_THRESHOLDS.MIN_RESPONSE_LENGTH})`
      );
    }

    // Check agents used
    if (metrics.agentsUsed > PERFORMANCE_THRESHOLDS.MAX_AGENTS) {
      warnings.push(
        `Agents used (${metrics.agentsUsed}) exceeded maximum (${PERFORMANCE_THRESHOLDS.MAX_AGENTS})`
      );
    }

    // Check success rate
    const aggregated = calculateAggregatedMetrics(metrics.workflowType);
    if (aggregated.successRate < PERFORMANCE_THRESHOLDS.MIN_SUCCESS_RATE) {
      warnings.push(
        `Success rate (${aggregated.successRate.toFixed(1)}%) below minimum (${
          PERFORMANCE_THRESHOLDS.MIN_SUCCESS_RATE
        }%)`
      );
    }

    // Log warnings
    if (warnings.length > 0) {
      logger.warn(
        `[Mastra Metrics] ⚠️ Performance warnings for ${metrics.workflowType}:`,
        warnings
      );
    }
  }

  /**
   * Log aggregated metrics for the workflow type
   */
  private logAggregatedMetrics(): void {
    const aggregated = calculateAggregatedMetrics(this.workflowType);

    logger.log(
      `[Mastra Metrics] 📊 Aggregated metrics for ${this.workflowType}:`,
      {
        totalExecutions: aggregated.totalExecutions,
        successRate: `${aggregated.successRate.toFixed(1)}%`,
        avgExecutionTime: `${aggregated.avgExecutionTime.toFixed(0)}ms`,
        avgAgentsUsed: aggregated.avgAgentsUsed.toFixed(1),
        avgResponseLength: aggregated.avgResponseLength.toFixed(0),
        fallbackCount: aggregated.fallbackCount,
      }
    );
  }
}

/**
 * Calculate aggregated metrics for a workflow type
 */
export function calculateAggregatedMetrics(
  workflowType: QueryComplexity
): WorkflowTypeMetrics {
  const metrics = metricsStore.get(workflowType);

  if (metrics.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      avgAgentsUsed: 0,
      avgResponseLength: 0,
      fallbackCount: 0,
      lastExecution: 0,
    };
  }

  const totalExecutions = metrics.length;
  const successfulExecutions = metrics.filter((m) => m.success).length;
  const failedExecutions = totalExecutions - successfulExecutions;
  const successRate = (successfulExecutions / totalExecutions) * 100;

  const executionTimes = metrics.map((m) => m.executionTime);
  const avgExecutionTime =
    executionTimes.reduce((a, b) => a + b, 0) / totalExecutions;
  const minExecutionTime = Math.min(...executionTimes);
  const maxExecutionTime = Math.max(...executionTimes);

  const avgAgentsUsed =
    metrics.reduce((sum, m) => sum + m.agentsUsed, 0) / totalExecutions;
  const avgResponseLength =
    metrics.reduce((sum, m) => sum + m.responseLength, 0) / totalExecutions;

  const fallbackCount = metrics.filter((m) => m.fallbackUsed).length;
  const lastExecution = Math.max(...metrics.map((m) => m.endTime));

  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate,
    avgExecutionTime,
    minExecutionTime,
    maxExecutionTime,
    avgAgentsUsed,
    avgResponseLength,
    fallbackCount,
    lastExecution,
  };
}

/**
 * Get all aggregated metrics
 */
export function getAllAggregatedMetrics(): Map<
  QueryComplexity,
  WorkflowTypeMetrics
> {
  const result = new Map<QueryComplexity, WorkflowTypeMetrics>();

  for (const workflowType of metricsStore.getWorkflowTypes()) {
    result.set(workflowType, calculateAggregatedMetrics(workflowType));
  }

  return result;
}

/**
 * Get metrics summary for logging
 */
export function getMetricsSummary(): {
  totalWorkflows: number;
  totalExecutions: number;
  overallSuccessRate: number;
  workflowMetrics: Record<string, WorkflowTypeMetrics>;
} {
  const allMetrics = getAllAggregatedMetrics();

  let totalExecutions = 0;
  let totalSuccessful = 0;

  const workflowMetrics: Record<string, WorkflowTypeMetrics> = {};

  for (const [workflowType, metrics] of allMetrics.entries()) {
    totalExecutions += metrics.totalExecutions;
    totalSuccessful += metrics.successfulExecutions;
    workflowMetrics[workflowType] = metrics;
  }

  const overallSuccessRate =
    totalExecutions > 0 ? (totalSuccessful / totalExecutions) * 100 : 0;

  return {
    totalWorkflows: allMetrics.size,
    totalExecutions,
    overallSuccessRate,
    workflowMetrics,
  };
}

/**
 * Log a summary of all metrics
 */
export function logMetricsSummary(): void {
  const summary = getMetricsSummary();

  logger.log("[Mastra Metrics] 📊 Overall Metrics Summary:", {
    totalWorkflows: summary.totalWorkflows,
    totalExecutions: summary.totalExecutions,
    overallSuccessRate: `${summary.overallSuccessRate.toFixed(1)}%`,
  });

  for (const [workflowType, metrics] of Object.entries(
    summary.workflowMetrics
  )) {
    logger.log(`[Mastra Metrics] 📊 ${workflowType}:`, {
      executions: metrics.totalExecutions,
      successRate: `${metrics.successRate.toFixed(1)}%`,
      avgTime: `${metrics.avgExecutionTime.toFixed(0)}ms`,
      fallbacks: metrics.fallbackCount,
    });
  }
}

/**
 * Clear all stored metrics
 */
export function clearMetrics(): void {
  metricsStore.clear();
  logger.log("[Mastra Metrics] 🗑️ All metrics cleared");
}

/**
 * Export metrics for external analysis
 */
export function exportMetrics(): {
  timestamp: string;
  summary: ReturnType<typeof getMetricsSummary>;
  rawMetrics: Record<string, MastraMetrics[]>;
} {
  const rawMetrics: Record<string, MastraMetrics[]> = {};

  for (const workflowType of metricsStore.getWorkflowTypes()) {
    rawMetrics[workflowType] = metricsStore.get(workflowType);
  }

  return {
    timestamp: new Date().toISOString(),
    summary: getMetricsSummary(),
    rawMetrics,
  };
}
