/**
 * Mastra Router
 *
 * Routes queries to appropriate Mastra agents and workflows based on complexity.
 * This router handles medium, deep, and workflow-level queries that require
 * multi-step processing or specialized workflows.
 *
 * Requirements:
 * - 7.1: Route simple/light queries to AI SDK
 * - 7.2: Route medium queries to Medium Research Agent
 * - 7.3: Route deep queries to Deep Research Workflow
 * - 7.4: Route workflow queries to appropriate workflows
 * - 7.5: Log routing decisions
 *
 * Usage:
 * ```typescript
 * const result = await routeToMastra(
 *   "medium",
 *   "What are the requirements for contract formation?",
 *   { userId: "123", chatId: "456" }
 * );
 * ```
 */

import {
  orchestrateLegal,
  orchestrateLegalStream,
  orchestrateLegalDirect,
  orchestrateResearch,
  orchestrateResearchStream,
} from "./agent-orchestrator";
import type { QueryComplexity } from "./complexity-detector";
import { MastraMetricsTracker } from "./mastra-metrics";
import { validateMastraResponse } from "./mastra-validation";
import { executeCaseLawAnalysis } from "./workflows/case-law-analysis";
import { executeDeepResearch } from "./workflows/deep-research";
import { executeDocumentReview } from "./workflows/document-review";
import { executeLegalDrafting } from "./workflows/legal-drafting";
import {
  getOptimalRoute,
  logRoutingDecision,
} from "./cerebras-router";

/**
 * Context for Mastra routing
 */
export type MastraContext = {
  userId?: string;
  chatId?: string;
  sessionId?: string;
};

/**
 * Result from Mastra agent or workflow execution
 */
export type MastraResult = {
  success: boolean;
  response: string;
  steps?: Array<{
    agent: string;
    duration?: number;
    output: string;
    error?: string;
  }>;
  duration?: number;
  agentsUsed?: number;
  documentId?: string;
};

/**
 * Route query to appropriate Mastra agent or workflow
 *
 * This function determines which Mastra component to use based on the
 * complexity level and executes it with the provided query and context.
 *
 * @param complexity - The query complexity level
 * @param query - The user's query text
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns Promise resolving to the execution result
 * @throws Error if complexity is not supported by Mastra
 */
export async function routeToMastra(
  complexity: QueryComplexity,
  query: string,
  context?: MastraContext
): Promise<MastraResult> {
  console.log("[Mastra Router] Routing query", {
    complexity,
    query: query.substring(0, 100),
    context,
  });

  // Initialize metrics tracker
  const metricsTracker = new MastraMetricsTracker(complexity);
  metricsTracker.recordStart();

  const startTime = Date.now();

  try {
    let result: MastraResult;

    switch (complexity) {
      case "medium": {
        console.log(
          "[Mastra Router] 🔍 Routing to Medium Research Agent with Synthesizer (dual-agent orchestration)"
        );

        try {
          // Use orchestrated dual-agent pattern: task agent → synthesizer
          const orchestrationResult = await orchestrateResearch(query, {
            userId: context?.userId,
          });

          const duration = Date.now() - startTime;

          // Check if orchestration succeeded
          const success =
            orchestrationResult.metadata.taskSuccess &&
            orchestrationResult.metadata.synthesisSuccess;

          if (success) {
            result = {
              success: true,
              response: orchestrationResult.synthesizedResponse,
              duration,
              agentsUsed: 2, // Task agent + synthesizer
            };

            console.log(
              "[Mastra Router] ✅ Medium Research orchestration completed",
              {
                duration: `${duration}ms`,
                taskDuration: `${orchestrationResult.metadata.taskDuration}ms`,
                synthesisDuration: `${orchestrationResult.metadata.synthesisDuration}ms`,
                responseLength: result.response.length,
                hasUserContext: !!context?.userId,
              }
            );
          } else {
            const errorReason = orchestrationResult.metadata.taskSuccess
              ? "Synthesizer failed"
              : "Task agent failed";

            console.error(
              "[Mastra Router] ❌ Medium Research orchestration failed",
              {
                error: errorReason,
                duration: `${duration}ms`,
                taskSuccess: orchestrationResult.metadata.taskSuccess,
                synthesisSuccess: orchestrationResult.metadata.synthesisSuccess,
              }
            );

            result = {
              success: false,
              response: "",
              duration,
              agentsUsed: 0,
            };
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          console.error(
            "[Mastra Router] ❌ Medium Research orchestration threw exception",
            {
              error: errorMessage,
              duration: `${duration}ms`,
            }
          );

          result = {
            success: false,
            response: "",
            duration,
            agentsUsed: 0,
          };
        }
        break;
      }

      case "deep": {
        console.log(
          "[Mastra Router] 🔬 Routing to Deep Research Workflow (3 agents: Search → Extract → Analyze)"
        );

        result = await executeDeepResearch(query, context);

        if (result.success) {
          console.log("[Mastra Router] ✅ Deep Research Workflow completed", {
            duration: `${result.duration}ms`,
            agentsUsed: result.agentsUsed,
            responseLength: result.response.length,
          });
        } else {
          console.error("[Mastra Router] ❌ Deep Research Workflow failed", {
            duration: `${result.duration}ms`,
            stepsCompleted: result.steps?.length || 0,
          });
        }
        break;
      }

      case "workflow-review": {
        console.log(
          "[Mastra Router] 📋 Routing to Document Review Workflow (3 agents: Structure → Issues → Recommendations)"
        );

        result = await executeDocumentReview(query, context);

        if (result.success) {
          console.log("[Mastra Router] ✅ Document Review Workflow completed", {
            duration: `${result.duration}ms`,
            agentsUsed: result.agentsUsed,
            responseLength: result.response.length,
          });
        } else {
          console.error("[Mastra Router] ❌ Document Review Workflow failed", {
            duration: `${result.duration}ms`,
            stepsCompleted: result.steps?.length || 0,
          });
        }
        break;
      }

      case "workflow-caselaw": {
        console.log(
          "[Mastra Router] ⚖️ Routing to Case Law Analysis Workflow (3 agents: Search Cases → Extract Holdings → Compare)"
        );

        result = await executeCaseLawAnalysis(query, context);

        if (result.success) {
          console.log(
            "[Mastra Router] ✅ Case Law Analysis Workflow completed",
            {
              duration: `${result.duration}ms`,
              agentsUsed: result.agentsUsed,
              responseLength: result.response.length,
            }
          );
        } else {
          console.error(
            "[Mastra Router] ❌ Case Law Analysis Workflow failed",
            {
              duration: `${result.duration}ms`,
              stepsCompleted: result.steps?.length || 0,
            }
          );
        }
        break;
      }

      case "workflow-drafting": {
        console.log(
          "[Mastra Router] ✍️ Routing to Legal Drafting Workflow (3 agents: Research → Draft → Refine)"
        );

        result = await executeLegalDrafting(query, context);

        if (result.success) {
          console.log("[Mastra Router] ✅ Legal Drafting Workflow completed", {
            duration: `${result.duration}ms`,
            agentsUsed: result.agentsUsed,
            responseLength: result.response.length,
            documentId: result.documentId,
          });
        } else {
          console.error("[Mastra Router] ❌ Legal Drafting Workflow failed", {
            duration: `${result.duration}ms`,
            stepsCompleted: result.steps?.length || 0,
          });
        }
        break;
      }

      case "simple":
      case "light": {
        console.log(
          `[Mastra Router] 💡 Routing ${complexity} query to Legal Agent with Synthesizer (dual-agent orchestration)`
        );

        // Special case for greetings - no need for agents
        const greetings = [
          "hi",
          "hello",
          "hey",
          "greetings",
          "good morning",
          "good afternoon",
        ];
        const isGreeting = greetings.some(
          (g) =>
            query.toLowerCase().trim() === g ||
            query.toLowerCase().trim().startsWith(`${g} `) ||
            query.toLowerCase().trim().startsWith(`${g}!`)
        );

        if (isGreeting) {
          const duration = Date.now() - startTime;
          result = {
            success: true,
            response:
              "Hello! I'm DeepCounsel, your AI legal assistant. I specialize in Zimbabwean and South African law, but I can help with legal research across various jurisdictions. How can I assist you today?",
            duration,
            agentsUsed: 0, // No agents needed for greeting
          };

          console.log(
            `[Mastra Router] ✅ ${complexity} query handled as greeting`,
            {
              duration: `${duration}ms`,
              responseLength: result.response.length,
            }
          );
          break;
        }

        try {
          // Use orchestrated dual-agent pattern: legal agent → synthesizer
          const orchestrationResult = await orchestrateLegal(query, {
            userId: context?.userId,
          });

          const duration = Date.now() - startTime;

          // Check if orchestration succeeded
          const success =
            orchestrationResult.metadata.taskSuccess &&
            orchestrationResult.metadata.synthesisSuccess;

          if (success) {
            result = {
              success: true,
              response: orchestrationResult.synthesizedResponse,
              duration,
              agentsUsed: 2, // Legal agent + synthesizer
            };

            console.log(
              `[Mastra Router] ✅ ${complexity} query orchestration completed`,
              {
                duration: `${duration}ms`,
                taskDuration: `${orchestrationResult.metadata.taskDuration}ms`,
                synthesisDuration: `${orchestrationResult.metadata.synthesisDuration}ms`,
                responseLength: result.response.length,
                hasUserContext: !!context?.userId,
              }
            );
          } else {
            const errorReason = orchestrationResult.metadata.taskSuccess
              ? "Synthesizer failed"
              : "Legal agent failed";

            console.error(
              `[Mastra Router] ❌ ${complexity} query orchestration failed`,
              {
                error: errorReason,
                duration: `${duration}ms`,
                taskSuccess: orchestrationResult.metadata.taskSuccess,
                synthesisSuccess: orchestrationResult.metadata.synthesisSuccess,
              }
            );

            result = {
              success: false,
              response: "",
              duration,
              agentsUsed: 0,
            };
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          console.error(
            `[Mastra Router] ❌ ${complexity} query orchestration threw exception`,
            {
              error: errorMessage,
              duration: `${duration}ms`,
            }
          );

          result = {
            success: false,
            response: "",
            duration,
            agentsUsed: 0,
          };
        }
        break;
      }

      default: {
        const duration = Date.now() - startTime;
        const errorMessage = `Unsupported complexity level for Mastra: ${complexity}`;

        console.error("[Mastra Router] ❌ Invalid routing", {
          complexity,
          error: errorMessage,
          duration: `${duration}ms`,
        });

        throw new Error(errorMessage);
      }
    }

    // Validate the result before returning
    const validation = validateMastraResponse(result);

    if (validation.isValid) {
      console.log("[Mastra Router] ✅ Response validation passed", {
        complexity,
        responseLength: validation.responseLength,
      });
    } else {
      console.error("[Mastra Router] ❌ Response validation failed", {
        complexity,
        reason: validation.reason,
        responseLength: validation.responseLength,
      });

      // Mark result as failed due to validation
      result.success = false;
    }

    // Record completion and log metrics
    metricsTracker.recordComplete(result);
    metricsTracker.logMetrics();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[Mastra Router] ❌ Routing failed", {
      complexity,
      error: errorMessage,
      duration: `${duration}ms`,
    });

    // Record failed result for metrics
    const failedResult: MastraResult = {
      success: false,
      response: "",
      duration,
      agentsUsed: 0,
    };
    metricsTracker.recordComplete(failedResult);
    metricsTracker.logMetrics();

    throw error;
  }
}

/**
 * Stream query to appropriate Mastra agent or workflow (AI SDK v5 format)
 *
 * This function provides streaming support for Mastra routing with AI SDK v5
 * compatibility. Returns streams that can use toUIMessageStreamResponse().
 *
 * @param complexity - The query complexity level
 * @param query - The user's query text
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns AI SDK v5 compatible stream
 * @throws Error if complexity is not supported by Mastra
 */
export async function streamMastraRoute(
  complexity: QueryComplexity,
  query: string,
  context?: MastraContext
) {
  console.log("[Mastra Router] Streaming query (AI SDK v5 format)", {
    complexity,
    query: query.substring(0, 100),
    context,
  });

  try {
    switch (complexity) {
      case "medium": {
        console.log(
          "[Mastra Router] 🔍 Streaming Medium Research Agent with Synthesizer (AI SDK v5)"
        );

        const result = await orchestrateResearchStream(query, {
          userId: context?.userId,
        });

        console.log(
          "[Mastra Router] ✅ Medium Research stream created (AI SDK v5 format)"
        );

        return result.stream;
      }

      case "simple":
      case "light": {
        console.log(
          `[Mastra Router] 💡 Streaming ${complexity} query with smart routing (Cerebras optimized)`
        );

        // Determine optimal route based on query characteristics
        const routeDecision = getOptimalRoute(query, complexity);
        const routeStartTime = Date.now();

        // Expected latency map
        const expectedLatency: Record<string, string> = {
          "cerebras-direct": "100-500ms",
          "tavily-qna": "1-2s",
          "full-workflow": "5-20s",
        };

        // Log routing decision for monitoring
        logRoutingDecision(
          routeDecision,
          query,
          complexity,
          expectedLatency[routeDecision] || "unknown"
        );

        // Handle different routing strategies
        switch (routeDecision) {
          case "cerebras-direct": {
            // Fast path: Direct to Cerebras without synthesis or tools
            // Expected: 100-500ms TTFB
            console.log(
              `[Mastra Router] ⚡ ${complexity} query → CEREBRAS DIRECT (ultra-fast path, no tools)`
            );

            const result = await orchestrateLegalDirect(query, {
              userId: context?.userId,
            });

            const routeDuration = Date.now() - routeStartTime;
            console.log(
              `[Mastra Router] ✅ Cerebras direct stream created in ${routeDuration}ms (expected: 100-500ms)`
            );

            return result.stream;
          }

          case "tavily-qna": {
            // Optimized path: Tavily QNA for current info, then direct Cerebras
            // Expected: 1-2s TTFB
            console.log(
              `[Mastra Router] 🔍 ${complexity} query → TAVILY QNA + CEREBRAS (optimized search path)`
            );

            // Use the existing legal agent with tools (it will call Tavily QNA)
            const result = await orchestrateLegalDirect(query, {
              userId: context?.userId,
            });

            const routeDuration = Date.now() - routeStartTime;
            console.log(
              `[Mastra Router] ✅ Tavily QNA + Cerebras stream created in ${routeDuration}ms (expected: 1-2s)`
            );

            return result.stream;
          }

          case "full-workflow": {
            // Full workflow: Task agent → synthesizer with all tools
            // Expected: 5-20s depending on tool usage
            console.log(
              `[Mastra Router] 🔄 ${complexity} query → FULL WORKFLOW (task agent + synthesizer)`
            );

            const result = await orchestrateLegalStream(query, {
              userId: context?.userId,
            });

            const routeDuration = Date.now() - routeStartTime;
            console.log(
              `[Mastra Router] ✅ Full workflow stream created in ${routeDuration}ms (expected: 5-20s)`
            );

            return result.stream;
          }

          default: {
            // Fallback to full workflow if routing decision is unclear
            console.warn(
              `[Mastra Router] ⚠️ Unknown route decision: ${routeDecision}, falling back to full workflow`
            );

            const result = await orchestrateLegalStream(query, {
              userId: context?.userId,
            });

            return result.stream;
          }
        }
      }

      case "deep":
      case "workflow-review":
      case "workflow-caselaw":
      case "workflow-drafting": {
        const errorMessage = `Streaming not yet implemented for ${complexity} complexity. Use AI SDK fallback.`;

        console.error("[Mastra Router] ❌ Streaming not implemented", {
          complexity,
          error: errorMessage,
        });

        throw new Error(errorMessage);
      }

      default: {
        const errorMessage = `Unsupported complexity level for Mastra: ${complexity}`;

        console.error("[Mastra Router] ❌ Invalid streaming routing", {
          complexity,
          error: errorMessage,
        });

        throw new Error(errorMessage);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("[Mastra Router] ❌ Streaming routing failed", {
      complexity,
      error: errorMessage,
    });

    throw error;
  }
}
