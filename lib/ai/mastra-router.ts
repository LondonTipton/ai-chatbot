/**
 * Mastra Router
 *
 * Routes queries to appropriate Mastra workflows based on complexity.
 * This router handles all 8 complexity levels:
 * - basic: Quick Fact Search (1 search)
 * - light: Standard Research (2-3 searches)
 * - medium: Deep Research (4-5 searches)
 * - advanced: Comprehensive Research (6+ searches)
 * - deep: Multi-agent Deep Research Workflow (3 agents)
 * - workflow-review: Document Review Workflow (3 agents)
 * - workflow-caselaw: Case Law Analysis Workflow (3 agents)
 * - workflow-drafting: Legal Drafting Workflow (3 agents)
 *
 * Requirements:
 * - Route basic/light/medium/advanced to single-step search workflows
 * - Route deep/workflow-* to multi-agent workflows
 * - Log all routing decisions
 * - Track metrics for performance monitoring
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

import type { QueryComplexity } from "./complexity-detector";
import { MastraMetricsTracker } from "./mastra-metrics";
import { validateMastraResponse } from "./mastra-validation";
import { executeCaseLawAnalysis } from "./workflows/case-law-analysis";
import { executeDeepResearch } from "./workflows/deep-research";
import { executeDocumentReview } from "./workflows/document-review";
import { executeLegalDrafting } from "./workflows/legal-drafting";

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
      case "basic": {
        console.log(
          "[Mastra Router] ⚡ Routing to Quick Fact Search (1 search, fast lookup)"
        );

        try {
          // Import and execute the quick fact search workflow
          const { basicSearchWorkflow } = await import(
            "@/mastra/workflows/basic-search-workflow"
          );

          const run = await basicSearchWorkflow.createRunAsync();
          const workflowResult = await run.start({
            inputData: {
              query,
              jurisdiction: "Zimbabwe",
            },
          });

          const duration = Date.now() - startTime;

          if (workflowResult.status === "success") {
            const synthesizeStep = workflowResult.steps.synthesize;

            // Type guard to check if step was successful
            if (synthesizeStep && synthesizeStep.status === "success") {
              const output = synthesizeStep.output as {
                response: string;
                sources: Array<{ title: string; url: string }>;
                totalTokens: number;
              };

              result = {
                success: true,
                response: output.response,
                duration,
                agentsUsed: 1,
              };

              console.log("[Mastra Router] ✅ Quick Fact Search completed", {
                duration: `${duration}ms`,
                responseLength: output.response.length,
                sources: output.sources.length,
                tokens: output.totalTokens,
              });
            } else {
              console.error("[Mastra Router] ❌ Synthesize step failed", {
                status: synthesizeStep?.status,
                duration: `${duration}ms`,
              });

              result = {
                success: false,
                response: "",
                duration,
                agentsUsed: 0,
              };
            }
          } else {
            console.error("[Mastra Router] ❌ Quick Fact Search failed", {
              status: workflowResult.status,
              duration: `${duration}ms`,
            });

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
            "[Mastra Router] ❌ Quick Fact Search threw exception",
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

      case "light": {
        console.log(
          "[Mastra Router] 📚 Routing to Standard Research (2-3 searches, balanced depth)"
        );

        try {
          // Import and execute the standard research workflow
          const { lowAdvanceSearchWorkflow } = await import(
            "@/mastra/workflows/low-advance-search-workflow"
          );

          const run = await lowAdvanceSearchWorkflow.createRunAsync();
          const workflowResult = await run.start({
            inputData: {
              query,
              jurisdiction: "Zimbabwe",
            },
          });

          const duration = Date.now() - startTime;

          if (workflowResult.status === "success") {
            const synthesizeStep = workflowResult.steps.synthesize;

            // Type guard to check if step was successful
            if (synthesizeStep && synthesizeStep.status === "success") {
              const output = synthesizeStep.output as {
                response: string;
                sources: Array<{ title: string; url: string }>;
                totalTokens: number;
              };

              result = {
                success: true,
                response: output.response,
                duration,
                agentsUsed: 1,
              };

              console.log("[Mastra Router] ✅ Standard Research completed", {
                duration: `${duration}ms`,
                responseLength: output.response.length,
                sources: output.sources.length,
                tokens: output.totalTokens,
              });
            } else {
              console.error("[Mastra Router] ❌ Synthesize step failed", {
                status: synthesizeStep?.status,
                duration: `${duration}ms`,
              });

              result = {
                success: false,
                response: "",
                duration,
                agentsUsed: 0,
              };
            }
          } else {
            console.error("[Mastra Router] ❌ Standard Research failed", {
              status: workflowResult.status,
              duration: `${duration}ms`,
            });

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
            "[Mastra Router] ❌ Standard Research threw exception",
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

      case "medium": {
        console.log(
          "[Mastra Router] 🔬 Routing to Deep Research (4-5 searches, analytical depth)"
        );

        try {
          // Import and execute the deep research workflow
          const { advancedSearchWorkflow } = await import(
            "@/mastra/workflows/advanced-search-workflow"
          );

          const run = await advancedSearchWorkflow.createRunAsync();
          const workflowResult = await run.start({
            inputData: {
              query,
              jurisdiction: "Zimbabwe",
            },
          });

          const duration = Date.now() - startTime;

          if (workflowResult.status === "success") {
            const synthesizeStep = workflowResult.steps.synthesize;

            // Type guard to check if step was successful
            if (synthesizeStep && synthesizeStep.status === "success") {
              const output = synthesizeStep.output as {
                response: string;
                sources: Array<{ title: string; url: string }>;
                totalTokens: number;
              };

              result = {
                success: true,
                response: output.response,
                duration,
                agentsUsed: 1,
              };

              console.log("[Mastra Router] ✅ Deep Research completed", {
                duration: `${duration}ms`,
                responseLength: output.response.length,
                sources: output.sources.length,
                tokens: output.totalTokens,
              });
            } else {
              console.error("[Mastra Router] ❌ Synthesize step failed", {
                status: synthesizeStep?.status,
                duration: `${duration}ms`,
              });

              result = {
                success: false,
                response: "",
                duration,
                agentsUsed: 0,
              };
            }
          } else {
            console.error("[Mastra Router] ❌ Deep Research failed", {
              status: workflowResult.status,
              duration: `${duration}ms`,
            });

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

          console.error("[Mastra Router] ❌ Deep Research threw exception", {
            error: errorMessage,
            duration: `${duration}ms`,
          });

          result = {
            success: false,
            response: "",
            duration,
            agentsUsed: 0,
          };
        }
        break;
      }

      case "advanced": {
        console.log(
          "[Mastra Router] 📖 Routing to Comprehensive Research (6+ searches, maximum coverage)"
        );

        try {
          // Import and execute the comprehensive research workflow
          const { highAdvanceSearchWorkflow } = await import(
            "@/mastra/workflows/high-advance-search-workflow"
          );

          const run = await highAdvanceSearchWorkflow.createRunAsync();
          const workflowResult = await run.start({
            inputData: {
              query,
              jurisdiction: "Zimbabwe",
            },
          });

          const duration = Date.now() - startTime;

          if (workflowResult.status === "success") {
            const synthesizeStep = workflowResult.steps.synthesize;

            // Type guard to check if step was successful
            if (synthesizeStep && synthesizeStep.status === "success") {
              const output = synthesizeStep.output as {
                response: string;
                sources: Array<{ title: string; url: string }>;
                totalTokens: number;
              };

              result = {
                success: true,
                response: output.response,
                duration,
                agentsUsed: 1,
              };

              console.log(
                "[Mastra Router] ✅ Comprehensive Research completed",
                {
                  duration: `${duration}ms`,
                  responseLength: output.response.length,
                  sources: output.sources.length,
                  tokens: output.totalTokens,
                }
              );
            } else {
              console.error("[Mastra Router] ❌ Synthesize step failed", {
                status: synthesizeStep?.status,
                duration: `${duration}ms`,
              });

              result = {
                success: false,
                response: "",
                duration,
                agentsUsed: 0,
              };
            }
          } else {
            console.error("[Mastra Router] ❌ Comprehensive Research failed", {
              status: workflowResult.status,
              duration: `${duration}ms`,
            });

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
            "[Mastra Router] ❌ Comprehensive Research threw exception",
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
 * Stream query to appropriate Mastra workflow (AI SDK v5 format)
 *
 * This function provides streaming support for Mastra routing with AI SDK v5
 * compatibility. Returns streams that can use toUIMessageStreamResponse().
 *
 * NOTE: Streaming is not currently implemented for workflow-based routing.
 * All workflows execute as complete units and return final results.
 *
 * @param complexity - The query complexity level
 * @param query - The user's query text
 * @param context - Optional context (userId, chatId, sessionId)
 * @returns AI SDK v5 compatible stream
 * @throws Error - Streaming not implemented for workflow routing
 */
export function streamMastraRoute(
  complexity: QueryComplexity,
  query: string,
  context?: MastraContext
): never {
  console.log("[Mastra Router] Streaming query request (not implemented)", {
    complexity,
    query: query.substring(0, 100),
    context,
  });

  // Streaming is not implemented for workflow-based routing
  // All complexity levels use workflows which complete in single execution
  const errorMessage = `Streaming not yet implemented for ${complexity} complexity. Workflows execute as complete units.`;

  console.error("[Mastra Router] ❌ Streaming not implemented", {
    complexity,
    error: errorMessage,
    suggestion: "Use routeToMastra() for non-streaming execution",
  });

  throw new Error(errorMessage);
}
