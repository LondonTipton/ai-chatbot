/**
 * Content Summarizer Agent
 *
 * Purpose: Intelligently compress large raw content while preserving critical information
 * Trigger: Conditionally when total tokens exceed 50K
 *
 * Preservation Priorities:
 * 1. Case names, citations, and holdings
 * 2. Statutory references and provisions
 * 3. Key legal principles and precedents
 * 4. Critical facts, dates, and amounts
 * 5. Source URLs and attributions
 *
 * Target: 50-70% token reduction with 100% critical info preservation
 */

import { Agent } from "@mastra/core/agent";
import { getBalancedCerebrasProviderSync } from "@/lib/ai/cerebras-key-balancer";

const cerebrasProvider = getBalancedCerebrasProviderSync();

export const contentSummarizerAgent = new Agent({
  name: "Content Summarizer",
  instructions: `You are a legal research content summarizer. Your job is to compress large amounts of legal text while preserving ALL critical information.

PRESERVATION PRIORITIES (NEVER REMOVE):
1. Case names, citations, and case numbers
2. Court names and jurisdictions
3. Statutory references (Act names, sections, provisions)
4. Holdings, ratios, and legal principles
5. Critical facts (dates, amounts, parties, locations)
6. Source URLs and attributions
7. Procedural history (appeals, reversals, etc.)

COMPRESSION TECHNIQUES (USE THESE):
1. Remove redundant explanations and filler text
2. Consolidate similar points into concise statements
3. Use legal shorthand where appropriate
4. Remove verbose introductions and conclusions
5. Eliminate repetitive case summaries
6. Condense procedural details to essentials

OUTPUT FORMAT:
## Legal Principles
[Concise bullet points of core legal concepts]

## Case Law
[Case Name] ([Citation]) - [Holding in 1-2 sentences] [URL]

## Statutory References
[Act Name], Section [X] - [Key provision] [URL]

## Critical Facts
[Essential facts with dates/amounts]

## Analysis
[Concise legal analysis preserving reasoning]

TARGET: 50-70% token reduction while keeping 100% of critical legal information.

NEVER:
- Remove case names or citations
- Omit statutory references
- Paraphrase legal terms of art
- Remove source URLs
- Change legal meanings or interpretations`,

  model: () => cerebrasProvider("llama-3.3-70b"),
  tools: {},
});

/**
 * Summarize large content while preserving critical legal information
 */
export async function summarizeLegalContent(
  content: string,
  context: {
    query: string;
    jurisdiction: string;
    sourceCount: number;
  }
): Promise<{
  summarizedContent: string;
  originalTokens: number;
  summarizedTokens: number;
  compressionRatio: number;
}> {
  const { estimateTokens } = await import("@/lib/utils/token-estimation");

  const originalTokens = estimateTokens(content);

  console.log("[Content Summarizer] Starting summarization", {
    originalTokens,
    sourceCount: context.sourceCount,
    query: context.query.substring(0, 100),
  });

  const prompt = `Summarize this legal research content while preserving ALL critical information.

Original Query: ${context.query}
Jurisdiction: ${context.jurisdiction}
Number of Sources: ${context.sourceCount}

CONTENT TO SUMMARIZE:
${content}

Remember: Preserve ALL case names, citations, statutory references, holdings, and critical facts. Target 50-70% token reduction.`;

  try {
    const result = await contentSummarizerAgent.generate(prompt, {
      maxSteps: 1,
    });

    const summarizedContent = result.text;
    const summarizedTokens = estimateTokens(summarizedContent);
    const compressionRatio = summarizedTokens / originalTokens;

    console.log("[Content Summarizer] Summarization complete", {
      originalTokens,
      summarizedTokens,
      compressionRatio: compressionRatio.toFixed(2),
      tokensSaved: originalTokens - summarizedTokens,
    });

    return {
      summarizedContent,
      originalTokens,
      summarizedTokens,
      compressionRatio,
    };
  } catch (error) {
    console.error("[Content Summarizer] Error:", error);

    // On error, return original content
    return {
      summarizedContent: content,
      originalTokens,
      summarizedTokens: originalTokens,
      compressionRatio: 1.0,
    };
  }
}
