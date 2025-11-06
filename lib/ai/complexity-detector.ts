import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/complexity-detector");

/**
 * Complexity Detection System
 * Routes queries to appropriate AI system based on complexity
 */

export type QueryComplexity =
  | "simple" // Direct Q&A with QNA search
  | "light" // Single search with answer
  | "medium" // Multiple searches
  | "deep" // Multi-step: search → extract → analyze
  | "workflow-review" // Document review workflow
  | "workflow-caselaw" // Case law analysis workflow
  | "workflow-drafting"; // Legal drafting workflow

export interface ComplexityAnalysis {
  complexity: QueryComplexity;
  reasoning: string;
  requiresResearch: boolean;
  requiresMultiStep: boolean;
  estimatedSteps: number;
}

/**
 * Detect query complexity based on content and intent
 */
export function detectQueryComplexity(message: string): ComplexityAnalysis {
  const lowerMessage = message.toLowerCase();

  logger.log("[Complexity] 🔍 Analyzing query complexity...");
  logger.log(
    "[Complexity] Query preview:",
    message.substring(0, 100) + (message.length > 100 ? "..." : "")
  );

  // Workflow indicators (multi-agent) - Check first
  const draftingIndicators = [
    "draft a",
    "draft an",
    "write a",
    "prepare a",
    "create a contract",
    "create an agreement",
    "create a motion",
    "create heads of argument",
  ];

  const caseLawIndicators = [
    "compare cases",
    "compare precedent",
    "analyze precedent",
    "case law comparison",
    "compare holdings",
    "precedent analysis",
  ];

  const reviewIndicators = [
    "review this",
    "review the",
    "analyze this document",
    "validate and improve",
    "suggest improvements",
    "check for compliance",
  ];

  // Deep research indicators
  const deepIndicators = [
    "compare cases",
    "compare precedent",
    "analyze precedent",
    "analyze case law",
    "extract key holdings",
    "extract and analyze",
    "compare holdings",
    "across different jurisdictions",
    "comparative analysis",
    "legal framework analysis",
    "comprehensive review",
  ];

  // Medium research indicators
  const mediumIndicators = [
    "find cases about",
    "find cases on",
    "search for cases",
    "what are the cases",
    "recent developments",
    "multiple sources",
    "various aspects",
    "different perspectives",
  ];

  // Light research indicators
  const lightIndicators = [
    "explain",
    "tell me about",
    "how does",
    "describe",
    "overview of",
  ];

  // Simple indicators (most specific, check last)
  const simpleIndicators = ["what is", "define", "meaning of", "definition of"];

  // Greeting indicators (ultra-simple, no research needed)
  const greetingIndicators = ["hi", "hello", "hey", "greetings"];

  // Check for greetings first
  if (
    greetingIndicators.some(
      (indicator) =>
        lowerMessage.trim() === indicator ||
        lowerMessage.trim().startsWith(`${indicator} `) ||
        lowerMessage.trim().startsWith(`${indicator}!`)
    )
  ) {
    const result = {
      complexity: "simple" as QueryComplexity,
      reasoning: "Simple greeting, no research needed",
      requiresResearch: false,
      requiresMultiStep: false,
      estimatedSteps: 1,
    };
    logger.log("[Complexity] ✅ Detected: simple (greeting)");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for drafting workflow
  if (
    draftingIndicators.some((indicator) => lowerMessage.includes(indicator))
  ) {
    const result = {
      complexity: "workflow-drafting" as QueryComplexity,
      reasoning:
        "Requires legal drafting workflow with research and refinement",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 9,
    };
    logger.log("[Complexity] ✅ Detected: workflow-drafting");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for case law workflow
  if (caseLawIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "workflow-caselaw" as QueryComplexity,
      reasoning: "Requires case law analysis workflow with comparison",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 9,
    };
    logger.log("[Complexity] ✅ Detected: workflow-caselaw");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for review workflow
  if (reviewIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "workflow-review" as QueryComplexity,
      reasoning: "Requires document review workflow with validation steps",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 9,
    };
    logger.log("[Complexity] ✅ Detected: workflow-review");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for deep research
  if (deepIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "deep" as QueryComplexity,
      reasoning: "Requires multi-step research with extraction and analysis",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 4,
    };
    logger.log("[Complexity] ✅ Detected: deep");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for medium research
  if (mediumIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "medium" as QueryComplexity,
      reasoning:
        "Requires multiple search queries to gather comprehensive information",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 3,
    };
    logger.log("[Complexity] ✅ Detected: medium");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for light research
  if (lightIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "light" as QueryComplexity,
      reasoning: "Requires single search with detailed answer",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 1,
    };
    logger.log("[Complexity] ✅ Detected: light");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for simple Q&A
  if (simpleIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "simple" as QueryComplexity,
      reasoning: "Direct question answering with quick search",
      requiresResearch: false,
      requiresMultiStep: false,
      estimatedSteps: 1,
    };
    logger.log("[Complexity] ✅ Detected: simple");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Default to light (safer than simple)
  const result = {
    complexity: "light" as QueryComplexity,
    reasoning: "General query requiring detailed information",
    requiresResearch: true,
    requiresMultiStep: false,
    estimatedSteps: 1,
  };
  logger.log("[Complexity] ✅ Detected: light (default)");
  logger.log("[Complexity] Reasoning:", result.reasoning);
  logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
  return result;
}

/**
 * Determine if query should use Mastra or AI SDK
 * Updated: Route medium+ complexity queries through Mastra
 * Medium queries use chatAgent with workflow tool capability
 */
export function shouldUseMastra(complexity: QueryComplexity): boolean {
  // Route medium and higher complexity queries through Mastra
  // Medium uses chatAgent with advancedSearchWorkflow tool
  // Deep and workflow types use searchAgent
  const useMastra =
    complexity === "medium" ||
    complexity === "deep" ||
    complexity === "workflow-review" ||
    complexity === "workflow-caselaw" ||
    complexity === "workflow-drafting";

  logger.log(
    `[Complexity] 🤖 Route decision: ${
      useMastra ? "Mastra" : "AI SDK"
    } for complexity: ${complexity}`
  );

  if (complexity === "medium") {
    logger.log(
      "[Complexity] 📋 Medium complexity will use chatAgent with workflow tool capability"
    );
  }

  return useMastra;
}

/**
 * Get appropriate workflow/agent for complexity level
 */
export function getWorkflowType(complexity: QueryComplexity): string {
  let workflowType: string;

  switch (complexity) {
    case "medium":
      workflowType = "mediumResearchAgent";
      break;
    case "deep":
      workflowType = "deepResearchWorkflow";
      break;
    case "workflow-review":
      workflowType = "documentReviewWorkflow";
      break;
    case "workflow-caselaw":
      workflowType = "caseLawAnalysisWorkflow";
      break;
    case "workflow-drafting":
      workflowType = "legalDraftingWorkflow";
      break;
    default:
      workflowType = "none";
  }

  logger.log(
    `[Complexity] 📋 Workflow type: ${workflowType} for complexity: ${complexity}`
  );

  return workflowType;
}
