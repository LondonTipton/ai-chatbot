import "server-only";

import { createLogger } from "@/lib/logger";
import { analysisAgent } from "@/mastra/agents/analysis-agent";
import { extractAgent } from "@/mastra/agents/extract-agent";
import { legalAgent } from "@/mastra/agents/legal-agent";
import { legalAgentDirect } from "@/mastra/agents/legal-agent-direct";
import { mediumResearchAgent } from "@/mastra/agents/medium-research-agent";
import { researchAgentDirect } from "@/mastra/agents/research-agent-direct";
import { searchAgent } from "@/mastra/agents/search-agent";
import { synthesizerAgent } from "@/mastra/agents/synthesizer-agent";

const logger = createLogger("ai/agent-orchestrator");

export type AgentPair = {
  taskAgent: any;
  directAgent?: any; // Tool-free agent for fast path
  name: string;
  description: string;
};

export const AGENT_PAIRS: Record<string, AgentPair> = {
  legal: {
    taskAgent: legalAgent,
    directAgent: legalAgentDirect, // NO TOOLS version for cerebras-direct
    name: "Legal Research",
    description: "Legal research with web search and extraction capabilities",
  },
  search: {
    taskAgent: searchAgent,
    name: "Web Search",
    description: "Targeted web search for finding relevant sources",
  },
  extract: {
    taskAgent: extractAgent,
    name: "Content Extraction",
    description: "Extract full content from URLs and sources",
  },
  analysis: {
    taskAgent: analysisAgent,
    name: "Deep Analysis",
    description: "Comprehensive analysis of provided content",
  },
  research: {
    taskAgent: mediumResearchAgent,
    directAgent: researchAgentDirect, // NO TOOLS version for cerebras-direct
    name: "Research",
    description: "Multi-step research with advanced search",
  },
};

export type OrchestrationResult = {
  taskResult: any;
  synthesizedResponse: string;
  metadata: {
    taskAgent: string;
    taskDuration: number;
    synthesisDuration: number;
    totalDuration: number;
    taskSuccess: boolean;
    synthesisSuccess: boolean;
  };
};

/**
 * Streaming orchestration result (AI SDK v5 compatible)
 */
export type StreamOrchestrationResult = {
  stream: any; // AI SDK v5 stream with toUIMessageStreamResponse()
  metadata: {
    taskAgent: string;
    taskSuccess: boolean;
  };
};

/**
 * CEREBRAS FAST PATH: Direct streaming without synthesis
 *
 * For queries where synthesis isn't needed, stream the agent directly.
 * Cerebras inference is 100-500ms, so this is the fastest path.
 *
 * CRITICAL: Uses tool-free agents to avoid web search overhead!
 *
 * Use cases:
 * - Greetings and simple interactions
 * - Definitional queries (What is contract law?)
 * - General questions that don't require web search
 *
 * @param agentType - Which agent to use
 * @param query - User's query
 * @param context - Optional context
 * @returns AI SDK v5 stream
 */
export async function orchestrateDirectStreamCerebras(
  agentType: keyof typeof AGENT_PAIRS,
  query: string,
  context?: {
    messages?: any[];
    userId?: string;
    chatId?: string;
  }
): Promise<StreamOrchestrationResult> {
  const pair = AGENT_PAIRS[agentType];
  if (!pair) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Use directAgent if available (tool-free), otherwise fall back to taskAgent
  const agent = pair.directAgent || pair.taskAgent;
  const agentMode = pair.directAgent
    ? "DIRECT (NO TOOLS)"
    : "FALLBACK (has tools)";

  logger.log(
    `[Agent Orchestrator] ⚡ CEREBRAS FAST PATH: Direct streaming ${agentType} (${agentMode})`
  );

  if (!pair.directAgent) {
    logger.warn(
      `[Agent Orchestrator] ⚠️  WARNING: No direct agent for ${agentType}, using tool-enabled agent (may be slow!)`
    );
  }

  logger.log("[Agent Orchestrator] 🎯 No synthesis - immediate response");

  // Enhanced prompt to ensure quality output without synthesis
  const enhancedQuery = `${query}

Please provide a comprehensive, well-structured response with:

## Executive Summary
[Brief 2-3 sentence overview]

## Key Points
- [Main point 1]
- [Main point 2]
- [Main point 3]

## Detailed Explanation
[Comprehensive information with examples and specifics]

## References
[Any relevant citations or sources]

## Recommendations
[Actionable takeaways if applicable]

Format your response professionally and completely. Make it clear and easy to understand.`;

  try {
    const stream = await agent.stream(enhancedQuery, {
      format: "aisdk", // AI SDK v5 compatibility
      ...(context || {}),
    });

    logger.log(
      `[Agent Orchestrator] ✅ Cerebras direct stream started (100-500ms TTFB, ${agentMode})`
    );

    return {
      stream,
      metadata: {
        taskAgent: agentType,
        taskSuccess: true,
      },
    };
  } catch (error) {
    logger.error(
      "[Agent Orchestrator] ❌ Cerebras direct stream failed:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Orchestrate a dual-agent workflow with streaming (AI SDK v5 format)
 *
 * Step 1: Run task agent to gather information/perform analysis
 * Step 2: Stream synthesizer response directly to client
 *
 * Returns an AI SDK v5 compatible stream that can be used with
 * toUIMessageStreamResponse() for direct frontend integration.
 */
export async function orchestrateAgentPairStream(
  agentType: keyof typeof AGENT_PAIRS,
  query: string,
  context?: {
    messages?: any[];
    userId?: string;
    chatId?: string;
  }
): Promise<StreamOrchestrationResult> {
  logger.log(
    `[Agent Orchestrator] 🚀 Starting ${agentType} dual-agent STREAMING workflow`
  );
  logger.log(`[Agent Orchestrator] 📝 Query: "${query.substring(0, 100)}..."`);

  const pair = AGENT_PAIRS[agentType];
  if (!pair) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  let taskResult: any = null;
  let taskSuccess = false;

  // Step 1: Run task agent (non-streaming to get results)
  try {
    logger.log(
      `[Agent Orchestrator] 🔧 Step 1: Running ${pair.name} task agent...`
    );
    const taskStart = Date.now();

    taskResult = await pair.taskAgent.generate(query, {
      ...(context || {}),
    });

    const taskDuration = Date.now() - taskStart;
    taskSuccess = true;

    logger.log(
      `[Agent Orchestrator] ✅ Task agent completed in ${taskDuration}ms`
    );
    logger.log(
      `[Agent Orchestrator] 📊 Task result type: ${typeof taskResult}`
    );

    // Log a preview of the result
    if (taskResult?.text) {
      logger.log(
        `[Agent Orchestrator] 📄 Task output preview: "${taskResult.text.substring(
          0,
          100
        )}..."`
      );
    } else {
      logger.log(
        `[Agent Orchestrator] 📄 Task output: ${JSON.stringify(
          taskResult
        ).substring(0, 100)}...`
      );
    }
  } catch (error) {
    logger.error(
      "[Agent Orchestrator] ❌ Task agent failed:",
      error instanceof Error ? error.message : error
    );
    taskResult = {
      error: error instanceof Error ? error.message : "Unknown error",
      query,
    };
  }

  // Step 2: Stream synthesizer with task results (AI SDK v5 format)
  logger.log("[Agent Orchestrator] 🧪 Step 2: Starting synthesizer stream...");

  // Extract text content from task result
  let taskOutput = "";
  if (typeof taskResult === "string") {
    taskOutput = taskResult;
  } else if (taskResult?.text) {
    taskOutput = taskResult.text;
  } else if (taskResult?.output) {
    taskOutput = taskResult.output;
  } else {
    // If no obvious text field, stringify the whole result
    taskOutput = JSON.stringify(taskResult, null, 2);
  }

  const synthesisPrompt = `You are synthesizing information to answer this user query:

**User Query:**
${query}

**Raw Information from Task Agent (${pair.name}):**
${taskOutput}

**Your Task:**
Create a comprehensive, well-structured response that directly answers the user's question. Follow this format:

## Executive Summary
[Brief 2-3 sentence overview]

## Key Findings
- [Main point 1]
- [Main point 2]
- [Main point 3]

## Detailed Explanation
[Comprehensive information with examples and specifics]

## Sources & References
[List URLs and citations if available in the data]

## Recommendations
[Actionable takeaways]

CRITICAL: Make this response complete, clear, and useful. The user should not need to see the raw data to understand the answer.`;

  try {
    // Stream with AI SDK v5 format
    const stream = await synthesizerAgent.stream(synthesisPrompt, {
      format: "aisdk", // Enable AI SDK v5 compatibility
    });

    logger.log(
      "[Agent Orchestrator] ✅ Synthesizer stream started (AI SDK v5 format)"
    );

    return {
      stream,
      metadata: {
        taskAgent: agentType,
        taskSuccess,
      },
    };
  } catch (error) {
    logger.error(
      "[Agent Orchestrator] ❌ Synthesizer stream failed:",
      error instanceof Error ? error.message : error
    );

    throw error;
  }
}

/**
 * Orchestrate a dual-agent workflow (non-streaming, for backward compatibility)
 *
 * Step 1: Run task agent to gather information/perform analysis
 * Step 2: Run synthesizer agent to create human-readable response
 *
 * This ensures we ALWAYS get a text response, even if the task agent
 * only produces tool results or structured data.
 */
export async function orchestrateAgentPair(
  agentType: keyof typeof AGENT_PAIRS,
  query: string,
  context?: {
    messages?: any[];
    userId?: string;
    chatId?: string;
  }
): Promise<OrchestrationResult> {
  const startTime = Date.now();

  logger.log(
    `[Agent Orchestrator] 🚀 Starting ${agentType} dual-agent workflow`
  );
  logger.log(`[Agent Orchestrator] 📝 Query: "${query.substring(0, 100)}..."`);

  const pair = AGENT_PAIRS[agentType];
  if (!pair) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  let taskResult: any = null;
  let taskSuccess = false;
  let synthesizedResponse = "";
  let synthesisSuccess = false;

  // Step 1: Run task agent
  try {
    logger.log(
      `[Agent Orchestrator] 🔧 Step 1: Running ${pair.name} task agent...`
    );
    const taskStart = Date.now();

    taskResult = await pair.taskAgent.generate(query, {
      ...(context || {}),
    });

    const taskDuration = Date.now() - taskStart;
    taskSuccess = true;

    logger.log(
      `[Agent Orchestrator] ✅ Task agent completed in ${taskDuration}ms`
    );
    logger.log(
      `[Agent Orchestrator] 📊 Task result type: ${typeof taskResult}`
    );

    // Log a preview of the result
    if (taskResult?.text) {
      logger.log(
        `[Agent Orchestrator] 📄 Task output preview: "${taskResult.text.substring(
          0,
          100
        )}..."`
      );
    } else {
      logger.log(
        `[Agent Orchestrator] 📄 Task output: ${JSON.stringify(
          taskResult
        ).substring(0, 100)}...`
      );
    }
  } catch (error) {
    logger.error(
      "[Agent Orchestrator] ❌ Task agent failed:",
      error instanceof Error ? error.message : error
    );
    taskResult = {
      error: error instanceof Error ? error.message : "Unknown error",
      query,
    };
  }

  // Step 2: Run synthesizer with task results
  try {
    logger.log("[Agent Orchestrator] 🧪 Step 2: Running synthesizer agent...");
    const synthesisStart = Date.now();

    // Extract text content from task result
    let taskOutput = "";
    if (typeof taskResult === "string") {
      taskOutput = taskResult;
    } else if (taskResult?.text) {
      taskOutput = taskResult.text;
    } else if (taskResult?.output) {
      taskOutput = taskResult.output;
    } else {
      // If no obvious text field, stringify the whole result
      taskOutput = JSON.stringify(taskResult, null, 2);
    }

    const synthesisPrompt = `You are synthesizing information to answer this user query:

**User Query:**
${query}

**Raw Information from Task Agent (${pair.name}):**
${taskOutput}

**Your Task:**
Create a comprehensive, well-structured response that directly answers the user's question. Follow this format:

## Executive Summary
[Brief 2-3 sentence overview]

## Key Findings
- [Main point 1]
- [Main point 2]
- [Main point 3]

## Detailed Explanation
[Comprehensive information with examples and specifics]

## Sources & References
[List URLs and citations if available in the data]

## Recommendations
[Actionable takeaways]

CRITICAL: Make this response complete, clear, and useful. The user should not need to see the raw data to understand the answer.`;

    const synthesisResult = await synthesizerAgent.generate(synthesisPrompt);

    const synthesisDuration = Date.now() - synthesisStart;
    synthesisSuccess = true;

    // Extract text from synthesis result
    if (typeof synthesisResult === "string") {
      synthesizedResponse = synthesisResult;
    } else if (synthesisResult?.text) {
      synthesizedResponse = synthesisResult.text;
    } else {
      synthesizedResponse = JSON.stringify(synthesisResult);
    }

    logger.log(
      `[Agent Orchestrator] ✅ Synthesizer completed in ${synthesisDuration}ms`
    );
    logger.log(
      `[Agent Orchestrator] 📝 Response length: ${synthesizedResponse.length} chars`
    );
  } catch (error) {
    logger.error(
      "[Agent Orchestrator] ❌ Synthesizer failed:",
      error instanceof Error ? error.message : error
    );

    // Create emergency fallback response
    synthesizedResponse = `I processed your query about "${query.substring(
      0,
      50
    )}..." using ${
      pair.name
    }, but encountered an issue creating the final response. 

The task agent completed its work, but the synthesis step failed. Please try rephrasing your question or contact support if this issue persists.

Error details: ${error instanceof Error ? error.message : "Unknown error"}`;
  }

  const totalDuration = Date.now() - startTime;

  logger.log(
    `[Agent Orchestrator] 🎯 Total dual-agent workflow: ${totalDuration}ms`
  );
  logger.log(
    `[Agent Orchestrator] 📊 Status: Task=${
      taskSuccess ? "✅" : "❌"
    }, Synthesis=${synthesisSuccess ? "✅" : "❌"}`
  );

  return {
    taskResult,
    synthesizedResponse: synthesizedResponse || "No response generated.",
    metadata: {
      taskAgent: agentType,
      taskDuration: 0,
      synthesisDuration: 0,
      totalDuration,
      taskSuccess,
      synthesisSuccess,
    },
  };
}

// Convenience functions for each agent type
export function orchestrateLegal(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<OrchestrationResult> {
  return orchestrateAgentPair("legal", query, context);
}

export function orchestrateLegalStream(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateAgentPairStream("legal", query, context);
}

export function orchestrateLegalDirect(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateDirectStreamCerebras("legal", query, context);
}

export function orchestrateSearch(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<OrchestrationResult> {
  return orchestrateAgentPair("search", query, context);
}

export function orchestrateSearchStream(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateAgentPairStream("search", query, context);
}

export function orchestrateSearchDirect(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateDirectStreamCerebras("search", query, context);
}

export function orchestrateExtraction(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<OrchestrationResult> {
  return orchestrateAgentPair("extract", query, context);
}

export function orchestrateExtractionStream(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateAgentPairStream("extract", query, context);
}

export function orchestrateExtractionDirect(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateDirectStreamCerebras("extract", query, context);
}

export function orchestrateAnalysis(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<OrchestrationResult> {
  return orchestrateAgentPair("analysis", query, context);
}

export function orchestrateAnalysisStream(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateAgentPairStream("analysis", query, context);
}

export function orchestrateAnalysisDirect(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateDirectStreamCerebras("analysis", query, context);
}

export function orchestrateResearch(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<OrchestrationResult> {
  return orchestrateAgentPair("research", query, context);
}

export function orchestrateResearchStream(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateAgentPairStream("research", query, context);
}

export function orchestrateResearchDirect(
  query: string,
  context?: { messages?: any[]; userId?: string; chatId?: string }
): Promise<StreamOrchestrationResult> {
  return orchestrateDirectStreamCerebras("research", query, context);
}
