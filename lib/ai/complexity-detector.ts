/**
 * Complexity Detection System
 * Routes queries to appropriate AI system based on complexity
 */

export type QueryComplexity =
  | "simple" // Direct Q&A with QNA search
  | "light" // Single search with answer
  | "medium" // Multiple searches
  | "deep" // Multi-step: search → extract → analyze
  | "workflow"; // Multi-agent workflows

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

  // Workflow indicators (multi-agent) - Check first
  const workflowIndicators = [
    "review this",
    "review the",
    "analyze and suggest",
    "validate and improve",
    "step by step",
    "suggest improvements",
    "for compliance",
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

  // Check for workflow complexity
  if (
    workflowIndicators.some((indicator) => lowerMessage.includes(indicator))
  ) {
    return {
      complexity: "workflow",
      reasoning: "Requires multi-agent workflow with validation steps",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 5,
    };
  }

  // Check for deep research
  if (deepIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    return {
      complexity: "deep",
      reasoning: "Requires multi-step research with extraction and analysis",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 4,
    };
  }

  // Check for medium research
  if (mediumIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    return {
      complexity: "medium",
      reasoning:
        "Requires multiple search queries to gather comprehensive information",
      requiresResearch: true,
      requiresMultiStep: true,
      estimatedSteps: 3,
    };
  }

  // Check for light research
  if (lightIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    return {
      complexity: "light",
      reasoning: "Requires single search with detailed answer",
      requiresResearch: true,
      requiresMultiStep: false,
      estimatedSteps: 1,
    };
  }

  // Check for simple Q&A
  if (simpleIndicators.some((indicator) => lowerMessage.includes(indicator))) {
    return {
      complexity: "simple",
      reasoning: "Direct question answering with quick search",
      requiresResearch: false,
      requiresMultiStep: false,
      estimatedSteps: 1,
    };
  }

  // Default to light (safer than simple)
  return {
    complexity: "light",
    reasoning: "General query requiring detailed information",
    requiresResearch: true,
    requiresMultiStep: false,
    estimatedSteps: 1,
  };
}

/**
 * Determine if query should use Mastra or AI SDK
 */
export function shouldUseMastra(complexity: QueryComplexity): boolean {
  return (
    complexity === "medium" ||
    complexity === "deep" ||
    complexity === "workflow"
  );
}

/**
 * Get appropriate workflow/agent for complexity level
 */
export function getWorkflowType(complexity: QueryComplexity): string {
  switch (complexity) {
    case "medium":
      return "mediumResearchAgent";
    case "deep":
      return "deepResearchWorkflow";
    case "workflow":
      return "documentReviewWorkflow";
    default:
      return "none";
  }
}
