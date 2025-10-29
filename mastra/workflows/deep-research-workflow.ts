import { Step, Workflow } from "@mastra/core";
import { z } from "zod";
import { analysisAgent } from "../agents/analysis-agent";
import { extractAgent } from "../agents/extract-agent";
import { searchAgent } from "../agents/search-agent";

/**
 * Deep Research Workflow
 * Multi-step: Search → Extract → Analyze
 * Each agent limited to max 4 tool calls
 */

// Step 1: Search for sources
const searchStep = new Step({
  id: "search",
  execute: async ({ context }: { context: { query: string } }) => {
    console.log("[Deep Research] Step 1: Searching for sources...");

    const result = await searchAgent.generate(
      `Find the most relevant legal sources for: ${context.query}
      
      Perform 2-4 targeted searches to find authoritative sources.
      Return a list of URLs with brief descriptions.`
    );

    return {
      sources: result.text,
      query: context.query,
    };
  },
});

// Step 2: Extract content from sources
const extractStep = new Step({
  id: "extract",
  execute: async ({
    context,
  }: {
    context: { sources: string; query: string };
  }) => {
    console.log("[Deep Research] Step 2: Extracting content from sources...");

    const result = await extractAgent.generate(
      `Extract full content from the most relevant sources found:
      
      ${context.sources}
      
      Select the 3-4 most authoritative sources and extract their full content.
      Original query: ${context.query}`
    );

    return {
      extractedContent: result.text,
      sources: context.sources,
      query: context.query,
    };
  },
});

// Step 3: Analyze extracted content
const analyzeStep = new Step({
  id: "analyze",
  execute: async ({
    context,
  }: {
    context: {
      extractedContent: string;
      sources: string;
      query: string;
    };
  }) => {
    console.log("[Deep Research] Step 3: Analyzing content...");

    const result = await analysisAgent.generate(
      `Provide a comprehensive legal analysis based on the extracted content:
      
      Original query: ${context.query}
      
      Sources found:
      ${context.sources}
      
      Extracted content:
      ${context.extractedContent}
      
      Provide a thorough analysis with:
      1. Overview of the legal issue
      2. Key findings from each source
      3. Comparative analysis
      4. Relevant precedents
      5. Synthesized conclusion with citations`
    );

    return {
      analysis: result.text,
      query: context.query,
    };
  },
});

/**
 * Deep Research Workflow
 * Orchestrates search → extract → analyze pipeline
 */
export const deepResearchWorkflow = new Workflow({
  name: "deep-research-workflow",
  triggerSchema: z.object({
    query: z.string().describe("The legal research query"),
  }),
});

deepResearchWorkflow
  .step(searchStep)
  .then(extractStep)
  .then(analyzeStep)
  .commit();
