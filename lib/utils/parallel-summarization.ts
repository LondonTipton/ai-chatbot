import { summarizerAgent } from "@/mastra/agents/summarizer-agent";
import { estimateTokens } from "./token-estimation";

/**
 * Parallel Summarization Utility
 *
 * Handles hierarchical multi-agent summarization for large documents (60K+ tokens).
 * Dynamically determines the number of parallel agents based on document size.
 *
 * Token Limits:
 * - Input per agent: 10K tokens
 * - Output limit: 65K tokens
 * - Safe output target: 10K tokens per agent
 *
 * Agent Allocation Strategy:
 * - <10K tokens: 1 agent (no parallelization)
 * - 10K-60K tokens: 2 agents (parallel)
 * - 60K-100K tokens: 4-6 agents (parallel)
 * - >100K tokens: up to 14 agents (parallel + sub-chunking if needed)
 *
 * Updated: November 6, 2025 - Implements 10K input limit and dynamic agent allocation
 */

export type ParallelSummarizationConfig = {
  maxInputPerAgent?: number; // Default: 10K tokens
  safeOutputTarget?: number; // Default: 10K tokens
  maxParallelAgents?: number; // Default: 14
};

export type SummarizationResult = {
  finalSummary: string;
  originalTokens: number;
  summarizedTokens: number;
  compressionRatio: number;
  agentsUsed: number;
  strategyUsed: "single" | "dual" | "parallel" | "hierarchical";
  agentOutputs: Array<{
    section: string;
    tokens: number;
    content: string;
  }>;
};

/**
 * Determine how many agents are needed based on document size
 */
function determineAgentsNeeded(
  totalTokens: number,
  maxInputPerAgent = 10_000
): {
  agentsNeeded: number;
  chunkSizePerAgent: number;
  strategy: "single" | "dual" | "parallel" | "hierarchical";
  subChunksPerAgent: number;
} {
  // Only need parallelization if content exceeds a single agent's capacity
  if (totalTokens <= maxInputPerAgent) {
    return {
      agentsNeeded: 1,
      chunkSizePerAgent: totalTokens,
      strategy: "single",
      subChunksPerAgent: 0,
    };
  }

  // For dual agents (10K-60K range)
  if (totalTokens <= 60_000) {
    return {
      agentsNeeded: 2,
      chunkSizePerAgent: Math.ceil(totalTokens / 2),
      strategy: "dual",
      subChunksPerAgent: 0,
    };
  }

  // For parallel agents (60K-100K)
  if (totalTokens <= 100_000) {
    const agentsNeeded = Math.ceil(totalTokens / maxInputPerAgent);
    return {
      agentsNeeded: Math.min(agentsNeeded, 10),
      chunkSizePerAgent: Math.ceil(totalTokens / Math.min(agentsNeeded, 10)),
      strategy: "parallel",
      subChunksPerAgent: 0,
    };
  }

  // For very large documents (>100K) - may need hierarchical approach
  const agentsNeeded = Math.ceil(totalTokens / maxInputPerAgent);
  return {
    agentsNeeded: Math.min(agentsNeeded, 14),
    chunkSizePerAgent: Math.ceil(totalTokens / Math.min(agentsNeeded, 14)),
    strategy: "hierarchical",
    subChunksPerAgent: 1, // Indicates sub-chunking may be needed
  };
}

/**
 * Split content into equal chunks
 */
function splitContentIntoChunks(
  content: string,
  numChunks: number
): Array<{ section: string; text: string; charLength: number }> {
  if (numChunks <= 1) {
    return [{ section: "full", text: content, charLength: content.length }];
  }

  const chunkSize = Math.ceil(content.length / numChunks);
  const chunks: Array<{ section: string; text: string; charLength: number }> =
    [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, content.length);
    const text = content.substring(start, end);

    chunks.push({
      section: `part-${i + 1}`,
      text,
      charLength: text.length,
    });
  }

  return chunks;
}

/**
 * Execute parallel summarization for a single chunk
 * (may include sub-chunking if chunk exceeds max input)
 */
async function summarizeChunkWithSubChunking(
  chunk: { section: string; text: string },
  maxInputPerAgent = 10_000
): Promise<{
  section: string;
  summary: string;
  originalTokens: number;
  summarizedTokens: number;
}> {
  const chunkTokens = estimateTokens(chunk.text);

  console.log(
    `[Parallel Summarization] Processing ${chunk.section}: ${chunkTokens} tokens`
  );

  // If chunk fits within agent capacity, single pass
  if (chunkTokens <= maxInputPerAgent) {
    try {
      const result = await summarizerAgent.generate(
        `Summarize this legal content, preserving ALL critical information (50-70% reduction):

${chunk.text}`,
        { maxSteps: 1 }
      );

      const summarizedTokens = estimateTokens(result.text);

      return {
        section: chunk.section,
        summary: result.text,
        originalTokens: chunkTokens,
        summarizedTokens,
      };
    } catch (error) {
      console.error(
        `[Parallel Summarization] Error summarizing ${chunk.section}:`,
        error
      );
      // Fallback: return truncated content
      return {
        section: chunk.section,
        summary: chunk.text.substring(0, Math.floor(chunk.text.length * 0.5)),
        originalTokens: chunkTokens,
        summarizedTokens: Math.ceil(chunkTokens * 0.5),
      };
    }
  }

  // Sub-chunking needed for this chunk
  console.log(
    `[Parallel Summarization] ${chunk.section} exceeds ${maxInputPerAgent} tokens, applying sub-chunking`
  );

  const numSubChunks = Math.ceil(chunkTokens / maxInputPerAgent);
  const subChunks = splitContentIntoChunks(chunk.text, numSubChunks);

  const subSummaries = await Promise.all(
    subChunks.map((subChunk) =>
      summarizerAgent.generate(
        `Summarize this section (preserve critical details, 40-50% reduction):

${subChunk.text}`,
        { maxSteps: 1 }
      )
    )
  );

  // Combine sub-summaries
  const combinedSummary = subSummaries
    .map((s, idx) => `[${chunk.section}-${idx + 1}]\n${s.text}`)
    .join("\n\n");

  const summarizedTokens = estimateTokens(combinedSummary);

  return {
    section: chunk.section,
    summary: combinedSummary,
    originalTokens: chunkTokens,
    summarizedTokens,
  };
}

/**
 * Main parallel summarization function
 *
 * Orchestrates multi-agent summarization for large documents.
 * Handles everything from agent allocation to synthesis.
 */
export async function parallelSummarize(
  content: string,
  config: ParallelSummarizationConfig = {}
): Promise<SummarizationResult> {
  const maxInputPerAgent = config.maxInputPerAgent ?? 10_000;
  const safeOutputTarget = config.safeOutputTarget ?? 10_000;

  const totalTokens = estimateTokens(content);

  console.log("[Parallel Summarization] Starting", {
    totalTokens,
    documentSize: `${(content.length / 1024).toFixed(2)} KB`,
  });

  // Determine agent allocation
  const { agentsNeeded, strategy } = determineAgentsNeeded(
    totalTokens,
    maxInputPerAgent
  );

  console.log("[Parallel Summarization] Agent allocation", {
    agentsNeeded,
    strategy,
    totalTokens,
  });

  // Split content into primary chunks
  const chunks = splitContentIntoChunks(content, agentsNeeded);

  // Execute parallel summarization
  const summaryPromises = chunks.map((chunk) =>
    summarizeChunkWithSubChunking(chunk, maxInputPerAgent)
  );

  const allSummaries = await Promise.all(summaryPromises);

  // Combine all summaries
  const combinedSummaryText = allSummaries
    .map((s) => `## ${s.section.toUpperCase()}\n${s.summary}`)
    .join("\n\n");

  const combinedTokens = estimateTokens(combinedSummaryText);

  console.log("[Parallel Summarization] Combined summaries", {
    agentsUsed: allSummaries.length,
    combinedTokens,
    needsFinalSynthesis: combinedTokens > safeOutputTarget * 1.5,
  });

  // Step 4: Final synthesis if still large
  let finalSummary = combinedSummaryText;
  let finalTokens = combinedTokens;

  if (combinedTokens > safeOutputTarget * 1.5 && agentsNeeded > 1) {
    console.log(
      `[Parallel Summarization] Applying final synthesis (${combinedTokens} → target ${safeOutputTarget})`
    );

    try {
      const synthesisResult = await summarizerAgent.generate(
        `You are a legal document synthesis expert. Integrate these section summaries into ONE cohesive, comprehensive summary. Preserve ALL critical dates, names, amounts, and legal terms:

${combinedSummaryText}

Output a unified, comprehensive summary with logical sections.`,
        { maxSteps: 1 }
      );

      finalSummary = synthesisResult.text;
      finalTokens = estimateTokens(finalSummary);

      console.log("[Parallel Summarization] Final synthesis complete", {
        before: combinedTokens,
        after: finalTokens,
      });
    } catch (error) {
      console.error("[Parallel Summarization] Final synthesis error:", error);
      // Use combined summaries as fallback
    }
  }

  const compressionRatio = finalTokens / totalTokens;

  console.log("[Parallel Summarization] Complete", {
    originalTokens: totalTokens,
    finalTokens,
    compressionRatio: compressionRatio.toFixed(3),
    agentsUsed: allSummaries.length,
    strategy,
  });

  return {
    finalSummary,
    originalTokens: totalTokens,
    summarizedTokens: finalTokens,
    compressionRatio,
    agentsUsed: allSummaries.length,
    strategyUsed: strategy,
    agentOutputs: allSummaries.map((s) => ({
      section: s.section,
      tokens: s.summarizedTokens,
      content: s.summary,
    })),
  };
}

/**
 * Simplified wrapper for quick summarization
 * (uses sensible defaults)
 */
export async function summarizeDocument(
  content: string,
  options?: {
    maxInputPerAgent?: number;
    description?: string;
  }
): Promise<SummarizationResult> {
  console.log(
    `[Summarize] ${options?.description || "Summarizing document"}...`
  );

  const result = await parallelSummarize(content, {
    maxInputPerAgent: options?.maxInputPerAgent,
  });

  console.log("[Summarize] Result:", {
    compression: `${(result.compressionRatio * 100).toFixed(1)}%`,
    agents: result.agentsUsed,
  });

  return result;
}
