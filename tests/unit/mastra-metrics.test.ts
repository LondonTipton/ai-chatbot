/**
 * Unit tests for Mastra Metrics
 *
 * Tests the performance monitoring system for Mastra workflows.
 */

import { expect, test } from "@playwright/test";
import {
  calculateAggregatedMetrics,
  clearMetrics,
  getAllAggregatedMetrics,
  getMetricsSummary,
  type MastraMetrics,
  MastraMetricsTracker,
  PERFORMANCE_THRESHOLDS,
} from "@/lib/ai/mastra-metrics";
import type { MastraResult } from "@/lib/ai/mastra-router";

test.describe("MastraMetricsTracker", () => {
  test.beforeEach(() => {
    // Clear metrics before each test
    clearMetrics();
  });

  test("should track successful workflow execution", () => {
    const tracker = new MastraMetricsTracker("medium");
    tracker.recordStart();

    const result: MastraResult = {
      success: true,
      response: "This is a test response with sufficient length",
      duration: 1500,
      agentsUsed: 1,
    };

    tracker.recordComplete(result);
    tracker.logMetrics();

    const aggregated = calculateAggregatedMetrics("medium");
    expect(aggregated.totalExecutions).toBe(1);
    expect(aggregated.successfulExecutions).toBe(1);
    expect(aggregated.successRate).toBe(100);
  });

  test("should track failed workflow execution", () => {
    const tracker = new MastraMetricsTracker("deep");
    tracker.recordStart();

    const result: MastraResult = {
      success: false,
      response: "",
      duration: 2000,
      agentsUsed: 0,
    };

    tracker.recordComplete(result);
    tracker.logMetrics();

    const aggregated = calculateAggregatedMetrics("deep");
    expect(aggregated.totalExecutions).toBe(1);
    expect(aggregated.failedExecutions).toBe(1);
    expect(aggregated.successRate).toBe(0);
  });

  test("should track fallback usage", () => {
    const tracker = new MastraMetricsTracker("workflow-review");
    tracker.recordStart();
    tracker.recordFallback();

    const result: MastraResult = {
      success: true,
      response: "Fallback response",
      duration: 1000,
      agentsUsed: 0,
    };

    tracker.recordComplete(result);
    tracker.logMetrics();

    const aggregated = calculateAggregatedMetrics("workflow-review");
    expect(aggregated.fallbackCount).toBe(1);
  });

  test("should calculate execution time correctly", () => {
    const tracker = new MastraMetricsTracker("medium");
    tracker.recordStart();

    // Simulate some delay
    const startTime = Date.now();
    while (Date.now() - startTime < 100) {
      // Wait 100ms
    }

    const result: MastraResult = {
      success: true,
      response: "Test response",
      duration: 100,
      agentsUsed: 1,
    };

    tracker.recordComplete(result);
    tracker.logMetrics();

    const aggregated = calculateAggregatedMetrics("medium");
    expect(aggregated.avgExecutionTime).toBeGreaterThanOrEqual(100);
  });
});

test.describe("Aggregated Metrics", () => {
  test.beforeEach(() => {
    clearMetrics();
  });

  test("should calculate correct success rate", () => {
    // Track 3 successful and 2 failed executions
    for (let i = 0; i < 3; i++) {
      const tracker = new MastraMetricsTracker("medium");
      tracker.recordStart();
      tracker.recordComplete({
        success: true,
        response: "Success response",
        duration: 1000,
        agentsUsed: 1,
      });
      tracker.logMetrics();
    }

    for (let i = 0; i < 2; i++) {
      const tracker = new MastraMetricsTracker("medium");
      tracker.recordStart();
      tracker.recordComplete({
        success: false,
        response: "",
        duration: 1000,
        agentsUsed: 0,
      });
      tracker.logMetrics();
    }

    const aggregated = calculateAggregatedMetrics("medium");
    expect(aggregated.totalExecutions).toBe(5);
    expect(aggregated.successfulExecutions).toBe(3);
    expect(aggregated.failedExecutions).toBe(2);
    expect(aggregated.successRate).toBe(60);
  });

  test("should calculate average execution time", () => {
    const executionTimes = [1000, 2000, 3000];

    for (const time of executionTimes) {
      const tracker = new MastraMetricsTracker("deep");
      tracker.recordStart();
      tracker.recordComplete({
        success: true,
        response: "Test response",
        duration: time,
        agentsUsed: 3,
      });
      tracker.logMetrics();
    }

    const aggregated = calculateAggregatedMetrics("deep");
    expect(aggregated.avgExecutionTime).toBe(2000);
    expect(aggregated.minExecutionTime).toBe(1000);
    expect(aggregated.maxExecutionTime).toBe(3000);
  });

  test("should calculate average agents used", () => {
    const agentCounts = [1, 2, 3];

    for (const count of agentCounts) {
      const tracker = new MastraMetricsTracker("workflow-caselaw");
      tracker.recordStart();
      tracker.recordComplete({
        success: true,
        response: "Test response",
        duration: 1000,
        agentsUsed: count,
      });
      tracker.logMetrics();
    }

    const aggregated = calculateAggregatedMetrics("workflow-caselaw");
    expect(aggregated.avgAgentsUsed).toBe(2);
  });

  test("should handle empty metrics", () => {
    const aggregated = calculateAggregatedMetrics("medium");

    expect(aggregated.totalExecutions).toBe(0);
    expect(aggregated.successRate).toBe(0);
    expect(aggregated.avgExecutionTime).toBe(0);
  });
});

test.describe("Metrics Summary", () => {
  test.beforeEach(() => {
    clearMetrics();
  });

  test("should generate summary for multiple workflow types", () => {
    // Track metrics for different workflow types
    const workflows: Array<{
      type: "medium" | "deep" | "workflow-review";
      success: boolean;
    }> = [
      { type: "medium", success: true },
      { type: "medium", success: true },
      { type: "deep", success: true },
      { type: "deep", success: false },
      { type: "workflow-review", success: true },
    ];

    for (const workflow of workflows) {
      const tracker = new MastraMetricsTracker(workflow.type);
      tracker.recordStart();
      tracker.recordComplete({
        success: workflow.success,
        response: workflow.success ? "Success" : "",
        duration: 1000,
        agentsUsed: workflow.success ? 1 : 0,
      });
      tracker.logMetrics();
    }

    const summary = getMetricsSummary();

    expect(summary.totalWorkflows).toBe(3);
    expect(summary.totalExecutions).toBe(5);
    expect(summary.overallSuccessRate).toBe(80); // 4 out of 5 successful

    expect(summary.workflowMetrics.medium.totalExecutions).toBe(2);
    expect(summary.workflowMetrics.medium.successRate).toBe(100);

    expect(summary.workflowMetrics.deep.totalExecutions).toBe(2);
    expect(summary.workflowMetrics.deep.successRate).toBe(50);

    expect(summary.workflowMetrics["workflow-review"].totalExecutions).toBe(1);
    expect(summary.workflowMetrics["workflow-review"].successRate).toBe(100);
  });

  test("should handle empty summary", () => {
    const summary = getMetricsSummary();

    expect(summary.totalWorkflows).toBe(0);
    expect(summary.totalExecutions).toBe(0);
    expect(summary.overallSuccessRate).toBe(0);
  });
});

test.describe("Performance Thresholds", () => {
  test("should have thresholds for all workflow types", () => {
    expect(PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME.medium).toBeDefined();
    expect(PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME.deep).toBeDefined();
    expect(
      PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME["workflow-review"]
    ).toBeDefined();
    expect(
      PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME["workflow-caselaw"]
    ).toBeDefined();
    expect(
      PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME["workflow-drafting"]
    ).toBeDefined();
  });

  test("should have reasonable threshold values", () => {
    // Medium queries should be fastest
    expect(PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME.medium).toBeLessThan(
      PERFORMANCE_THRESHOLDS.MAX_EXECUTION_TIME.deep
    );

    // Success rate should be high
    expect(PERFORMANCE_THRESHOLDS.MIN_SUCCESS_RATE).toBeGreaterThanOrEqual(90);

    // Response length should be reasonable
    expect(PERFORMANCE_THRESHOLDS.MIN_RESPONSE_LENGTH).toBeGreaterThan(0);

    // Max agents should match workflow design
    expect(PERFORMANCE_THRESHOLDS.MAX_AGENTS).toBe(3);
  });
});

test.describe("Metrics Storage", () => {
  test.beforeEach(() => {
    clearMetrics();
  });

  test("should store and retrieve metrics", () => {
    const tracker = new MastraMetricsTracker("medium");
    tracker.recordStart();
    tracker.recordComplete({
      success: true,
      response: "Test",
      duration: 1000,
      agentsUsed: 1,
    });
    tracker.logMetrics();

    const allMetrics = getAllAggregatedMetrics();
    expect(allMetrics.size).toBe(1);
    expect(allMetrics.has("medium")).toBe(true);
  });

  test("should clear all metrics", () => {
    // Add some metrics
    const tracker = new MastraMetricsTracker("medium");
    tracker.recordStart();
    tracker.recordComplete({
      success: true,
      response: "Test",
      duration: 1000,
      agentsUsed: 1,
    });
    tracker.logMetrics();

    // Clear metrics
    clearMetrics();

    // Verify cleared
    const summary = getMetricsSummary();
    expect(summary.totalExecutions).toBe(0);
  });

  test("should limit stored metrics to prevent memory issues", () => {
    // Add more than 100 metrics
    for (let i = 0; i < 150; i++) {
      const tracker = new MastraMetricsTracker("medium");
      tracker.recordStart();
      tracker.recordComplete({
        success: true,
        response: "Test",
        duration: 1000,
        agentsUsed: 1,
      });
      tracker.logMetrics();
    }

    const aggregated = calculateAggregatedMetrics("medium");
    // Should only keep last 100
    expect(aggregated.totalExecutions).toBeLessThanOrEqual(100);
  });
});
