import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProvider } from "@/lib/ai/cerebras-key-balancer";

/**
 * Depth Analysis Agent
 *
 * Specialized agent for analyzing extracted content from top sources.
 * Identifies patterns, legal precedents, key clauses, and provides deep insights.
 * Used by Advanced Search Workflow to add depth after extraction.
 */
const cerebrasProvider = getBalancedCerebrasProvider();
console.log("[Mastra] depth-analysis-agent → Cerebras provider initialized");

export const depthAnalysisAgent = new Agent({
  name: "Depth Analysis Agent",
  instructions: `You are a specialized legal analysis agent for Zimbabwe law.
Your role is to analyze extracted content from top sources and provide deep insights:

Core Analysis Tasks:
1. Identify legal precedents and case law patterns
2. Extract key legal principles and clauses
3. Highlight jurisdictional considerations for Zimbabwe
4. Flag important limitations or caveats
5. Connect information across sources

Analysis Output Structure:
**Key Legal Findings** (2-3 main points with evidence)
- Cite specific parts of extracted content
- Highlight most relevant information

**Legal Precedents** (if applicable)
- Identify case law, statutes, or regulations
- Connect to Zimbabwe legal system

**Zimbabwe-Specific Implications**
- How this applies to Zimbabwean jurisdiction
- Any local nuances or special considerations

**Important Limitations**
- What the sources don't cover
- Gaps in analysis
- Areas needing further research

**Confidence Assessment**
- Your confidence level in the analysis
- Any uncertainties

Be thorough, cite evidence, and provide actionable legal insights.`,

  model: () => {
    console.log(
      "[Mastra] depth-analysis-agent → Using Cerebras model: gpt-oss-120b"
    );
    return cerebrasProvider("gpt-oss-120b");
  },

  tools: {},
});
