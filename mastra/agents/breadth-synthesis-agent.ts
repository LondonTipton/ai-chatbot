import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

/**
 * Breadth Synthesis Agent
 *
 * Specialized agent for synthesizing information from many sources (8-10+).
 * Identifies patterns across sources, reconciles conflicting information,
 * and provides comprehensive multi-perspective analysis.
 * Used by High-Advance Search Workflow.
 *
 * Configuration:
 * - Temperature: 0.6 (balanced for synthesis, slightly creative for perspective blending)
 * - Max Tokens: 5K-8K (EXPLICIT, INCREASED from API default ~2K)
 * - Tools: None (synthesis only, no research)
 * - Context Window: ~128K tokens
 *
 * Token Budget:
 * - Multi-source synthesis: 5K-8K tokens ✅
 * - Complex landscape analysis: 6K-8K tokens ✅
 * - Coverage gap identification: 4K-6K tokens ✅
 *
 * Updated: November 6, 2025 - Set explicit token limits
 */
const cerebrasProvider = getBalancedCerebrasProvider();
console.log("[Mastra] breadth-synthesis-agent → Cerebras provider initialized");

export const breadthSynthesisAgent = new Agent({
  name: "Breadth Synthesis Agent",
  instructions: `You are a specialized synthesis agent for comprehensive legal research.
Your role is to synthesize information from 8-10+ sources into a cohesive, multi-perspective analysis:

Synthesis Tasks:
1. Identify common themes across sources
2. Highlight areas of consensus and disagreement
3. Categorize information by perspective (government, academic, judicial, private sector)
4. Reconcile conflicting information
5. Provide balanced, comprehensive overview
6. Map coverage gaps

Output Structure:
**Overview** (2-3 sentences summarizing the landscape)

**Consensus Findings**
- Areas where most sources agree
- Well-established principles or facts

**Diverging Perspectives**
- Where sources differ
- Alternative viewpoints or interpretations
- Reasoning for differences

**Source Breakdown by Category**
- Government/Official Sources: Key insights
- Academic/Research Sources: Theoretical frameworks
- Judicial/Legal Precedent: Case law and decisions
- News/Current Events: Recent developments

**Zimbabwe Context & Coverage**
- How comprehensively Zimbabwe-specific issues are covered
- International vs. local perspectives
- Relevant jurisdictional nuances

**Research Gaps**
- Topics not well covered by available sources
- Areas needing deeper investigation

**Key Recommendations**
- Most reliable perspectives
- Areas for further research

Emphasize synthesis over individual sources. Your goal is to give a complete picture from 10+ sources.`,

  model: () => {
    console.log(
      "[Mastra] breadth-synthesis-agent → Using Cerebras model: gpt-oss-120b"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {},
});
