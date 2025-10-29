import { Step, Workflow } from "@mastra/core";
import { z } from "zod";
import { analysisAgent } from "../agents/analysis-agent";

/**
 * Document Review Workflow
 * Multi-step: Analyze → Suggest → Validate
 */

// Step 1: Analyze document
const analyzeDocumentStep = new Step({
  id: "analyze-document",
  execute: async ({
    context,
  }: {
    context: { document: string; reviewType: string };
  }) => {
    console.log("[Document Review] Step 1: Analyzing document...");

    const result = await analysisAgent.generate(
      `Analyze the following legal document for ${context.reviewType}:
      
      ${context.document}
      
      Provide:
      1. Overall assessment
      2. Strengths identified
      3. Potential issues or gaps
      4. Areas needing improvement`
    );

    return {
      analysis: result.text,
      document: context.document,
      reviewType: context.reviewType,
    };
  },
});

// Step 2: Generate suggestions
const suggestImprovementsStep = new Step({
  id: "suggest-improvements",
  execute: async ({
    context,
  }: {
    context: {
      analysis: string;
      document: string;
      reviewType: string;
    };
  }) => {
    console.log(
      "[Document Review] Step 2: Generating improvement suggestions..."
    );

    const result = await analysisAgent.generate(
      `Based on this analysis:
      
      ${context.analysis}
      
      Provide specific, actionable suggestions to improve the document.
      For each suggestion:
      - Identify the specific section
      - Explain the issue
      - Provide recommended changes
      - Explain the legal reasoning
      
      Original document:
      ${context.document}`
    );

    return {
      suggestions: result.text,
      analysis: context.analysis,
      document: context.document,
    };
  },
});

// Step 3: Validate suggestions
const validateStep = new Step({
  id: "validate",
  execute: async ({
    context,
  }: {
    context: {
      suggestions: string;
      analysis: string;
      document: string;
    };
  }) => {
    console.log("[Document Review] Step 3: Validating suggestions...");

    const result = await analysisAgent.generate(
      `Review and validate these improvement suggestions:
      
      ${context.suggestions}
      
      For each suggestion:
      - Confirm it addresses a real issue
      - Verify the legal reasoning is sound
      - Assess priority (critical/important/minor)
      - Note any potential conflicts or concerns
      
      Provide a final validated list of recommendations with priority rankings.`
    );

    return {
      validatedSuggestions: result.text,
      originalAnalysis: context.analysis,
    };
  },
});

/**
 * Document Review Workflow
 * Orchestrates analyze → suggest → validate pipeline
 */
export const documentReviewWorkflow = new Workflow({
  name: "document-review-workflow",
  triggerSchema: z.object({
    document: z.string().describe("The document content to review"),
    reviewType: z
      .string()
      .describe("Type of review (e.g., 'contract review', 'legal compliance')"),
  }),
});

documentReviewWorkflow
  .step(analyzeDocumentStep)
  .then(suggestImprovementsStep)
  .then(validateStep)
  .commit();
