import { createLogger } from "@/lib/logger";

const logger = createLogger("ai/complexity-detector");

/**
 * Complexity Detection System
 * Routes queries to appropriate Mastra workflows
 *
 * Search Workflows (Single-step, varying depth):
 * - basic: Quick fact lookup (1 search)
 * - light: Standard research (2-3 searches)
 * - medium: Deep research (4-5 searches)
 * - advanced: Comprehensive research (6+ searches)
 *
 * Multi-Agent Workflows:
 * - deep: Deep Research Workflow (3 agents: Search → Extract → Analyze)
 * - workflow-review: Document Review Workflow (3 agents)
 * - workflow-caselaw: Case Law Analysis Workflow (3 agents)
 * - workflow-drafting: Legal Drafting Workflow (3 agents)
 *
 * Note: Comprehensive Analysis Workflow is UI-toggle only, not a complexity level
 */

export type QueryComplexity =
  | "basic" // Quick fact lookup (1 search) → quickFactSearch
  | "light" // Standard research (2-3 searches) → standardResearch
  | "medium" // Deep research (4-5 searches) → deepResearch
  | "advanced" // Comprehensive research (6+ searches) → comprehensiveResearch
  | "deep" // Multi-step: search → extract → analyze → Deep Research Workflow
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
 * Maps queries to appropriate Mastra workflows
 */
export function detectQueryComplexity(message: string): ComplexityAnalysis {
  const lowerMessage = message.toLowerCase();

  logger.log("[Complexity] 🔍 Analyzing query complexity...");
  logger.log(
    "[Complexity] Query preview:",
    message.substring(0, 100) + (message.length > 100 ? "..." : "")
  );

  // ============================================================================
  // PRIORITY 1: Specialized Workflows (Check First)
  // ============================================================================

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
    // Explicit case law requests
    "case law",
    "cases about",
    "cases on",
    "find cases",
    "cite cases",
    "precedent",
    "precedents",
    "judicial decisions",
    "court decisions",

    // Additional/supporting case law (CRITICAL - catches hallucination trigger)
    "additional case law",
    "additional cases",
    "more cases",
    "other cases",
    "supporting case law",
    "supporting cases",
    "what cases",
    "which cases",
    "any cases",
    "relevant cases",

    // Case comparison and analysis
    "compare cases",
    "compare precedent",
    "analyze precedent",
    "case law comparison",
    "compare holdings",
    "precedent analysis",

    // Citation requests
    "cite authorities",
    "cite sources",
    "provide citations",
    "legal authorities",
    "authorities supporting",

    // Verification requests
    "verify case law",
    "verified cases",
    "check case law",
  ];

  const reviewIndicators = [
    "review this",
    "review the",
    "analyze this document",
    "validate and improve",
    "suggest improvements",
    "check for compliance",
  ];

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

  // ============================================================================
  // PRIORITY 2: Deep Research Workflow (Multi-agent)
  // ============================================================================

  const deepIndicators = [
    "compare across jurisdictions",
    "comparative analysis",
    "legal framework analysis",
    "comprehensive review",
    "extract key holdings",
    "extract and analyze",
    "multi-jurisdictional",
    "cross-jurisdictional",
  ];

  // Check for deep research workflow (multi-agent)
  if (deepIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "deep" as QueryComplexity,
      reasoning: "Requires multi-agent workflow: search → extract → analyze",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 9,
    };
    logger.log("[Complexity] ✅ Detected: deep (multi-agent workflow)");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // ============================================================================
  // PRIORITY 3: Search Workflows (Single-step, varying depth)
  // ============================================================================

  // Advanced research indicators (6+ searches)
  const advancedIndicators = [
    "comprehensive analysis",
    "detailed analysis",
    "exhaustive research",
    "full analysis",
    "in-depth analysis",
    "thorough analysis",
  ];

  // Medium research indicators (4-5 searches)
  const mediumIndicators = [
    "analyze",
    "analysis of",
    "find cases about",
    "find cases on",
    "search for cases",
    "research on",
    "what are the cases",
    "recent developments",
    "legal requirements for",
    "framework for",
    "laws governing",
  ];

  // Light research indicators (2-3 searches)
  const lightIndicators = [
    "explain",
    "tell me about",
    "how does",
    "describe",
    "overview of",
    "what are the",
    "compare",
    "difference between",
    "similarities between",
  ];

  // Basic indicators (1 search)
  const basicIndicators = [
    "what is",
    "define",
    "meaning of",
    "definition of",
    "current",
    "latest",
    "recent",
    "when was",
    "who is",
    "where is",
  ];

  // Check for advanced research (user explicitly wants comprehensive)
  if (
    advancedIndicators.some((indicator) => lowerMessage.includes(indicator))
  ) {
    const result = {
      complexity: "advanced" as QueryComplexity,
      reasoning:
        "Requires comprehensive research workflow with 6+ searches for exhaustive analysis",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 8,
    };
    logger.log("[Complexity] ✅ Detected: advanced (comprehensive research)");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for medium research
  if (mediumIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "medium" as QueryComplexity,
      reasoning:
        "Requires deep research workflow with 4-5 searches for comprehensive understanding",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 6,
    };
    logger.log("[Complexity] ✅ Detected: medium (deep research)");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for light research
  if (lightIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "light" as QueryComplexity,
      reasoning:
        "Requires standard research workflow with 2-3 searches for balanced context",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 4,
    };
    logger.log("[Complexity] ✅ Detected: light (standard research)");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // Check for basic fact lookup
  if (basicIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    const result = {
      complexity: "basic" as QueryComplexity,
      reasoning:
        "Requires quick fact lookup workflow with single search for specific information",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 2,
    };
    logger.log("[Complexity] ✅ Detected: basic (quick fact lookup)");
    logger.log("[Complexity] Reasoning:", result.reasoning);
    logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
    return result;
  }

  // ============================================================================
  // DEFAULT: Light research (safer default for general queries)
  // ============================================================================

  const result = {
    complexity: "light" as QueryComplexity,
    reasoning:
      "General query defaulting to standard research (2-3 searches) for balanced coverage",
    requiresResearch: true,
    requiresMultiStep: true,
    estimatedSteps: 4,
  };
  logger.log("[Complexity] ✅ Detected: light (default - standard research)");
  logger.log("[Complexity] Reasoning:", result.reasoning);
  logger.log("[Complexity] Estimated steps:", result.estimatedSteps);
  return result;
}

/**
 * Get appropriate workflow/agent for complexity level
 * All queries now route through Mastra
 */
export function getWorkflowType(complexity: QueryComplexity): string {
  let workflowType: string;

  switch (complexity) {
    case "medium":
      workflowType = "chatAgent"; // Use chatAgent for medium complexity
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
      workflowType = "chatAgent"; // Default to chatAgent
  }

  logger.log(
    `[Complexity] 📋 Workflow type: ${workflowType} for complexity: ${complexity}`
  );

  return workflowType;
}
