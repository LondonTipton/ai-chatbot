# Mastra Performance Monitoring

This document describes the performance monitoring system for Mastra workflows and agents.

## Overview

The performance monitoring system tracks execution metrics for all Mastra workflows and agents, providing insights into:

- Execution time per workflow type
- Number of sub-agents used
- Success rates
- Response quality
- Performance degradation warnings

## Architecture

### Components

1. **MastraMetricsTracker** - Tracks individual workflow executions
2. **MetricsStore** - In-memory storage for metrics (last 100 per workflow type)
3. **Aggregated Metrics** - Calculated statistics per workflow type
4. **Performance Thresholds** - Configurable warning thresholds
5. **Metrics API** - HTTP endpoint for accessing metrics

## Usage

### Tracking Workflow Execution

The metrics tracker is automatically integrated into the Mastra router:

```typescript
import { MastraMetricsTracker } from "@/lib/ai/mastra-metrics";

// Create tracker for workflow type
const tracker = new MastraMetricsTracker("deep");

// Record start time
tracker.recordStart();

// Execute workflow
const result = await executeWorkflow(query);

// Record completion
tracker.recordComplete(result);

// Log metrics and check for warnings
tracker.logMetrics();
```

### Recording Fallback

If a workflow falls back to AI SDK:

```typescript
tracker.recordFallback();
```

### Accessing Metrics

#### Via API

```bash
# Get metrics summary
curl http://localhost:3000/api/admin/mastra-metrics

# Export all metrics (including raw data)
curl http://localhost:3000/api/admin/mastra-metrics?export=true

# Clear all metrics
curl -X DELETE http://localhost:3000/api/admin/mastra-metrics
```

#### Programmatically

```typescript
import {
  getMetricsSummary,
  calculateAggregatedMetrics,
  getAllAggregatedMetrics,
  logMetricsSummary,
} from "@/lib/ai/mastra-metrics";

// Get overall summary
const summary = getMetricsSummary();
console.log(summary);

// Get metrics for specific workflow type
const mediumMetrics = calculateAggregatedMetrics("medium");
console.log(mediumMetrics);

// Get all workflow metrics
const allMetrics = getAllAggregatedMetrics();

// Log summary to console
logMetricsSummary();
```

## Metrics Collected

### Per Execution

Each workflow execution records:

```typescript
interface MastraMetrics {
  workflowType: QueryComplexity; // "medium" | "deep" | "workflow-*"
  executionTime: number; // milliseconds
  agentsUsed: number; // number of sub-agents
  stepsCompleted: number; // number of steps completed
  success: boolean; // whether workflow succeeded
  fallbackUsed: boolean; // whether fallback to AI SDK was used
  responseLength: number; // length of response text
  startTime: number; // timestamp
  endTime: number; // timestamp
  error?: string; // error message if failed
}
```

### Aggregated Metrics

For each workflow type:

```typescript
interface WorkflowTypeMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number; // percentage (0-100)
  avgExecutionTime: number; // milliseconds
  minExecutionTime: number; // milliseconds
  maxExecutionTime: number; // milliseconds
  avgAgentsUsed: number;
  avgResponseLength: number;
  fallbackCount: number;
  lastExecution: number; // timestamp
}
```

## Performance Thresholds

The system monitors performance against these thresholds:

```typescript
const PERFORMANCE_THRESHOLDS = {
  MAX_EXECUTION_TIME: {
    medium: 10000, // 10 seconds
    deep: 30000, // 30 seconds
    "workflow-review": 25000, // 25 seconds
    "workflow-caselaw": 30000, // 30 seconds
    "workflow-drafting": 35000, // 35 seconds
  },
  MIN_SUCCESS_RATE: 90, // 90%
  MIN_RESPONSE_LENGTH: 50, // characters
  MAX_AGENTS: 3, // sub-agents per workflow
};
```

### Warning Conditions

Warnings are logged when:

1. **Execution time exceeds threshold** - Workflow took too long
2. **Response length below minimum** - Response may be incomplete
3. **Too many agents used** - Workflow used more than expected agents
4. **Success rate below threshold** - Too many failures for this workflow type

## Console Output

### Successful Execution

```
[Mastra Metrics] 📊 Starting deep workflow
[Mastra Metrics] ✅ Completed deep workflow
  executionTime: 2345ms
  success: true
  agentsUsed: 3
  responseLength: 1234

[Mastra Metrics] 📈 Workflow Metrics:
  workflowType: deep
  executionTime: 2345ms
  agentsUsed: 3
  stepsCompleted: 3
  success: true
  fallbackUsed: false
  responseLength: 1234

[Mastra Metrics] 📊 Aggregated metrics for deep:
  totalExecutions: 5
  successRate: 100.0%
  avgExecutionTime: 2500ms
  avgAgentsUsed: 3.0
  avgResponseLength: 1200
  fallbackCount: 0
```

### Performance Warning

```
[Mastra Metrics] ⚠️ Performance warnings for deep:
  - Execution time (35000ms) exceeded threshold (30000ms)
  - Success rate (85.0%) below minimum (90%)
```

### Failed Execution

```
[Mastra Metrics] ❌ Completed deep workflow
  executionTime: 5000ms
  success: false
  agentsUsed: 0
  responseLength: 0

[Mastra Metrics] ⚠️ Performance warnings for deep:
  - Response length (0) below minimum (50)
```

## Metrics Summary

Get an overview of all workflows:

```
[Mastra Metrics] 📊 Overall Metrics Summary:
  totalWorkflows: 3
  totalExecutions: 25
  overallSuccessRate: 96.0%

[Mastra Metrics] 📊 medium:
  executions: 10
  successRate: 100.0%
  avgTime: 1500ms
  fallbacks: 0

[Mastra Metrics] 📊 deep:
  executions: 10
  successRate: 90.0%
  avgTime: 2500ms
  fallbacks: 1

[Mastra Metrics] 📊 workflow-review:
  executions: 5
  successRate: 100.0%
  avgTime: 3000ms
  fallbacks: 0
```

## API Response Format

### GET /api/admin/mastra-metrics

```json
{
  "success": true,
  "data": {
    "totalWorkflows": 3,
    "totalExecutions": 25,
    "overallSuccessRate": 96.0,
    "workflowMetrics": {
      "medium": {
        "totalExecutions": 10,
        "successfulExecutions": 10,
        "failedExecutions": 0,
        "successRate": 100.0,
        "avgExecutionTime": 1500,
        "minExecutionTime": 1000,
        "maxExecutionTime": 2000,
        "avgAgentsUsed": 1.0,
        "avgResponseLength": 500,
        "fallbackCount": 0,
        "lastExecution": 1699564800000
      }
      // ... other workflow types
    }
  }
}
```

### GET /api/admin/mastra-metrics?export=true

```json
{
  "success": true,
  "data": {
    "timestamp": "2024-11-02T12:00:00.000Z",
    "summary": {
      // Same as above
    },
    "rawMetrics": {
      "medium": [
        {
          "workflowType": "medium",
          "executionTime": 1500,
          "agentsUsed": 1,
          "stepsCompleted": 3,
          "success": true,
          "fallbackUsed": false,
          "responseLength": 500,
          "startTime": 1699564800000,
          "endTime": 1699564801500
        }
        // ... more executions
      ]
      // ... other workflow types
    }
  }
}
```

## Storage

### In-Memory Storage

- Metrics are stored in memory (not persisted to database)
- Each workflow type stores last 100 executions
- Older metrics are automatically removed to prevent memory issues
- Metrics are lost on server restart

### Future Enhancements

For production use, consider:

1. **Persistent Storage** - Store metrics in database
2. **Time-Series Database** - Use InfluxDB or TimescaleDB for better analytics
3. **Monitoring Integration** - Send metrics to Datadog, New Relic, etc.
4. **Alerting** - Set up alerts for performance degradation
5. **Dashboards** - Create visual dashboards for metrics

## Testing

Run unit tests:

```bash
pnpm test tests/unit/mastra-metrics.test.ts
```

Tests cover:

- Individual workflow tracking
- Aggregated metrics calculation
- Success rate calculation
- Performance threshold validation
- Metrics storage and retrieval
- Memory limit enforcement

## Troubleshooting

### No Metrics Showing

1. Ensure workflows are being executed through `routeToMastra()`
2. Check that metrics tracker is initialized
3. Verify `logMetrics()` is called after execution

### Metrics Not Persisting

- Metrics are stored in memory only
- Server restart clears all metrics
- Consider implementing persistent storage for production

### Performance Warnings

If you see frequent warnings:

1. **Execution Time** - Optimize workflow steps or increase threshold
2. **Success Rate** - Investigate failure causes in logs
3. **Response Length** - Check if workflows are completing properly
4. **Agent Count** - Verify workflow configuration

### Memory Issues

If metrics consume too much memory:

1. Reduce the 100-execution limit per workflow type
2. Implement periodic cleanup
3. Move to persistent storage with retention policy

## Best Practices

1. **Monitor Regularly** - Check metrics summary daily
2. **Set Alerts** - Configure alerts for critical thresholds
3. **Analyze Trends** - Look for patterns in failures or slowdowns
4. **Optimize Workflows** - Use metrics to identify bottlenecks
5. **Document Changes** - Note when thresholds are adjusted and why

## Requirements Satisfied

This implementation satisfies the following requirements:

- **10.1**: Log workflow execution time ✅
- **10.2**: Log number of sub-agents used ✅
- **10.3**: Track success rate per workflow type ✅
- **10.4**: Log warnings when performance degrades ✅

## Related Files

- `lib/ai/mastra-metrics.ts` - Core metrics implementation
- `lib/ai/mastra-router.ts` - Integration with router
- `app/(chat)/api/admin/mastra-metrics/route.ts` - HTTP API
- `tests/unit/mastra-metrics.test.ts` - Unit tests
