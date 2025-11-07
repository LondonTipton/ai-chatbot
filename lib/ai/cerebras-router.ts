/**
 * Cerebras-Optimized Smart Routing
 *
 * Determines the optimal path for queries to minimize latency:
 * - Cerebras direct: 100-500ms (definitional/simple queries)
 * - Tavily QNA: 1-2s (requires current info or specific references)
 * - Full workflow: 5-20s (complex multi-step queries)
 *
 * Key insight: Cerebras inference is blazingly fast (100-500ms),
 * so only use external tools when absolutely necessary.
 */

// Regex patterns for current/specific information detection
const CURRENT_INFO_PATTERNS = [
  // Time-sensitive queries
  /recent|latest|current|new|update|now|today|this (year|month|week)/i,

  // Specific legal references
  /act|statute|law|regulation|amendment|bill|section \d+/i,
  /case|judgment|ruling|precedent|citation/i,

  // Geographic specificity (local laws change)
  /zimbabwe|zimbabwean|zim|harare|bulawayo/i,
  /south africa|south african|sa|pretoria|cape town|johannesburg/i,

  // Queries explicitly asking for search
  /find|search|look up|locate|where can i/i,

  // Queries needing verification
  /is there|does|has there been|when did|when was/i,
];

// Regex patterns for definitional queries
const DEFINITIONAL_PATTERNS = [
  /what is|what are|define|explain|describe/i,
  /how does|how do|how can/i,
  /why is|why are|why does/i,
  /difference between|compare|contrast/i,
];

// Regex patterns for tool requirement detection
const TOOL_INDICATORS = [
  // Explicit search requests
  /search|find|look up|locate/i,

  // Research-oriented queries
  /research|investigate|analyze|study|examine/i,

  // Comparative analysis requiring multiple sources
  /compare|contrast|difference.*between/i,

  // Extraction/detail requests
  /extract|get (the )?(full|complete)|details of/i,

  // Queries requiring citations
  /cite|reference|source|evidence/i,
];

// Common greetings
const GREETINGS = [
  "hi",
  "hello",
  "hey",
  "greetings",
  "good morning",
  "good afternoon",
  "good evening",
];

/**
 * Determine if a query requires Tavily search or can use Cerebras directly
 *
 * @param query - User's query text
 * @returns true if Tavily search is needed, false for Cerebras direct
 */
export function shouldUseTavilyForSimpleQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Check if query matches any pattern requiring search
  const requiresSearch = CURRENT_INFO_PATTERNS.some((pattern) =>
    pattern.test(lowerQuery)
  );

  if (requiresSearch) {
    console.log(
      "[Cerebras Router] 🔍 Query requires Tavily QNA (current/specific info needed)",
      {
        query: query.substring(0, 80),
        matchedPattern: true,
      }
    );
    return true;
  }

  // Definitional queries that Cerebras can handle directly
  const isDefinitional = DEFINITIONAL_PATTERNS.some((pattern) =>
    pattern.test(lowerQuery)
  );

  if (isDefinitional && !requiresSearch) {
    console.log(
      "[Cerebras Router] ⚡ Definitional query: Cerebras direct (100-500ms)",
      {
        query: query.substring(0, 80),
        pattern: "definitional",
      }
    );
    return false;
  }

  // Default: Use Cerebras direct for better speed
  // If answer is insufficient, user can rephrase or we can fallback
  console.log(
    "[Cerebras Router] ⚡ General query: Cerebras direct (default fast path)",
    {
      query: query.substring(0, 80),
    }
  );
  return false;
}

/**
 * Check if query needs web tools (search/extraction) vs pure LLM
 *
 * @param query - User's query text
 * @returns true if web tools are needed
 */
export function needsWebTools(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  const needsTools = TOOL_INDICATORS.some((pattern) =>
    pattern.test(lowerQuery)
  );

  console.log("[Cerebras Router] 🔧 Tool requirement check", {
    query: query.substring(0, 80),
    needsTools,
  });

  return needsTools;
}

/**
 * Estimate optimal route based on query characteristics
 *
 * @param query - User's query text
 * @param complexity - Detected query complexity
 * @returns Recommended routing strategy
 */
export function getOptimalRoute(
  query: string,
  complexity: string
): "cerebras-direct" | "tavily-qna" | "full-workflow" {
  // Greetings and simple interactions
  const isGreeting = GREETINGS.some(
    (g) =>
      query.toLowerCase().trim() === g ||
      query.toLowerCase().trim().startsWith(`${g} `) ||
      query.toLowerCase().trim().startsWith(`${g}!`)
  );

  if (isGreeting) {
    return "cerebras-direct";
  }

  // Route based on complexity
  if (complexity === "simple" || complexity === "light") {
    // Check if search is needed
    if (shouldUseTavilyForSimpleQuery(query)) {
      console.log(
        "[Cerebras Router] 🎯 Route: Tavily QNA (simple + search needed)"
      );
      return "tavily-qna";
    }

    console.log(
      "[Cerebras Router] 🎯 Route: Cerebras direct (simple + no search)"
    );
    return "cerebras-direct";
  }

  // Medium and above use full workflow
  console.log(
    "[Cerebras Router] 🎯 Route: Full workflow (medium/deep complexity)"
  );
  return "full-workflow";
}

/**
 * Log routing decision for monitoring
 *
 * @param route - Chosen route
 * @param query - User query
 * @param complexity - Query complexity
 * @param expectedLatency - Expected response time
 */
export function logRoutingDecision(
  route: string,
  query: string,
  complexity: string,
  expectedLatency: string
): void {
  console.log("=".repeat(80));
  console.log("[Cerebras Router] 🎯 ROUTING DECISION");
  console.log("=".repeat(80));
  console.log(
    `Query: "${query.substring(0, 100)}${query.length > 100 ? "..." : ""}"`
  );
  console.log(`Complexity: ${complexity}`);
  console.log(`Route: ${route}`);
  console.log(`Expected Latency: ${expectedLatency}`);
  console.log("=".repeat(80));
}
