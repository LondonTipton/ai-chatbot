# Using the Synthesis Validator - Examples

## Quick Start

The synthesis validator helps detect hallucinations and measure response quality.

### Basic Usage

```typescript
import { validateSynthesis } from "@/lib/ai/synthesis-validator";

// After synthesis in your workflow
const sources = [
  {
    title: "Consumer Protection Act Overview",
    url: "https://example.com/consumer-act",
    content: "The Consumer Protection Act provides remedies for breach..."
  }
];

const synthesizedResponse = "...your synthesized text...";

const validation = validateSynthesis(synthesizedResponse, sources);

console.log(`Valid: ${validation.isValid}`);
console.log(`Score: ${validation.score}/100`);
console.log(`Confidence: ${validation.details.confidence}`);
```

---

## Adding Validation to Advanced Search Workflow

Update `mastra/workflows/advanced-search-workflow.ts`:

```typescript
// In synthesizeStep execute function, after synthesis
import { validateSynthesis, formatValidationResult } from "@/lib/ai/synthesis-validator";

// ... existing synthesis code ...

const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
  maxSteps: 15,
});

// ✅ ADD VALIDATION HERE
const validation = validateSynthesis(
  synthesized.text,
  results.map(r => ({
    title: r.title,
    url: r.url,
    content: r.content
  }))
);

// Log validation results
if (!validation.isValid) {
  console.warn("[Advanced Search] ⚠️ Synthesis validation failed");
  console.warn(formatValidationResult(validation));
} else {
  console.log("[Advanced Search] ✅ Synthesis validated", {
    score: validation.score,
    confidence: validation.details.confidence,
  });
}

// Extract sources from results
const sources = results.map((r: any) => ({
  title: r.title,
  url: r.url,
}));

const synthesisTokens = Math.ceil(synthesized.text.length / 4);
const totalTokens = tokenEstimate + extractionTokens + synthesisTokens;

return {
  response: synthesized.text,
  sources,
  totalTokens,
  // ✅ ADD VALIDATION METADATA
  validationScore: validation.score,
  validationConfidence: validation.details.confidence,
  hallucinations: validation.hallucinations.length,
};
```

---

## Adding Validation to Enhanced Comprehensive Workflow

Update `mastra/workflows/enhanced-comprehensive-workflow.ts`:

```typescript
// In documentStep execute function
import { validateSynthesis } from "@/lib/ai/synthesis-validator";

const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
  maxSteps: 1,
});

// ✅ VALIDATE COMPREHENSIVE SYNTHESIS
// Note: For comprehensive workflow, we validate against the summarized content
const validation = validateSynthesis(
  synthesized.text,
  [{
    title: "Comprehensive Research",
    url: "internal://research",
    content: summarizedContent
  }]
);

console.log("[Enhanced Comprehensive] Validation Results", {
  score: validation.score,
  confidence: validation.details.confidence,
  hallucinations: validation.hallucinations.length,
  ungroundedClaims: validation.ungroundedClaims.length,
});

const synthesisTokens = Math.ceil(synthesized.text.length / 4);
const finalTotalTokens = totalTokens + synthesisTokens;

return {
  response: synthesized.text,
  totalTokens: finalTotalTokens,
  path,
  budgetReport,
  validationScore: validation.score,
  validationConfidence: validation.details.confidence,
};
```

---

## Conditional Fallback Based on Validation

Use validation to decide whether to use synthesis or fallback:

```typescript
const synthesized = await synthesizerAgent.generate(synthesisPrompt, {
  maxSteps: 15,
});

const validation = validateSynthesis(synthesized.text, results);

// ✅ USE VALIDATION TO DECIDE
if (validation.score < 60 || validation.hallucinations.length > 0) {
  console.warn("[Workflow] Low validation score - using structured fallback");
  
  // Return structured fallback instead
  const fallbackResponse = `# Research Findings
  
${results.map((r, i) => `## ${i + 1}. ${r.title}
**URL:** ${r.url}
${r.content}
`).join('\n\n')}

**Note:** Automatic synthesis did not meet quality thresholds (Score: ${validation.score}/100)`;

  return {
    response: fallbackResponse,
    sources: results.map(r => ({ title: r.title, url: r.url })),
    totalTokens: tokenEstimate,
    validationScore: validation.score,
    usedFallback: true,
  };
}

// Validation passed - use synthesis
return {
  response: synthesized.text,
  sources: results.map(r => ({ title: r.title, url: r.url })),
  totalTokens: tokenEstimate + synthesisTokens,
  validationScore: validation.score,
  usedFallback: false,
};
```

---

## Quick Validation for Fast Checks

Use `quickValidate()` for simple pass/fail:

```typescript
import { quickValidate } from "@/lib/ai/synthesis-validator";

const isValid = quickValidate(
  synthesized.text,
  sources.map(s => ({ url: s.url }))
);

if (!isValid) {
  console.warn("[Quick Check] Synthesis may contain hallucinations");
}
```

---

## Logging Validation Metrics

Track validation metrics over time:

```typescript
import { createLogger } from "@/lib/logger";

const logger = createLogger("synthesis-quality");

const validation = validateSynthesis(synthesized.text, sources);

logger.log("[Synthesis Quality Metrics]", {
  timestamp: new Date().toISOString(),
  workflowId: "advanced-search-workflow",
  query: query.substring(0, 100),
  validationScore: validation.score,
  confidence: validation.details.confidence,
  citedSources: validation.details.citedSources,
  totalSources: validation.details.totalSources,
  citationCoverage: (validation.details.citedSources / validation.details.totalSources * 100).toFixed(1),
  hallucinations: validation.hallucinations.length,
  ungroundedClaims: validation.ungroundedClaims.length,
  isValid: validation.isValid,
});
```

---

## Displaying Validation to Users (Optional)

Add validation metadata to response for debugging:

```typescript
// In your API response
return Response.json({
  response: synthesized.text,
  sources,
  totalTokens,
  // ✅ ADD QUALITY METADATA
  quality: {
    validationScore: validation.score,
    confidence: validation.details.confidence,
    citationCoverage: `${validation.details.citedSources}/${validation.details.totalSources}`,
    verified: validation.isValid,
  }
});
```

In your UI, you could show a quality indicator:

```typescript
// In your React component
{response.quality.verified ? (
  <Badge color="green">✅ Verified Response</Badge>
) : (
  <Badge color="yellow">⚠️ Unverified</Badge>
)}

<Text size="sm" color="gray">
  Quality Score: {response.quality.validationScore}/100
  ({response.quality.confidence} confidence)
</Text>
```

---

## Creating a Validation Dashboard

Track synthesis quality over time:

```typescript
// lib/analytics/synthesis-quality-tracker.ts
export interface QualityMetric {
  timestamp: Date;
  workflowId: string;
  query: string;
  validationScore: number;
  confidence: string;
  hallucinations: number;
  citationCoverage: number;
}

const metrics: QualityMetric[] = [];

export function trackQuality(
  workflowId: string,
  query: string,
  validation: ValidationResult
) {
  metrics.push({
    timestamp: new Date(),
    workflowId,
    query,
    validationScore: validation.score,
    confidence: validation.details.confidence,
    hallucinations: validation.hallucinations.length,
    citationCoverage: validation.details.citedSources / validation.details.totalSources,
  });
}

export function getQualityReport() {
  const avgScore = metrics.reduce((sum, m) => sum + m.validationScore, 0) / metrics.length;
  const totalHallucinations = metrics.reduce((sum, m) => sum + m.hallucinations, 0);
  const avgCitation = metrics.reduce((sum, m) => sum + m.citationCoverage, 0) / metrics.length;
  
  return {
    totalSyntheses: metrics.length,
    averageScore: avgScore.toFixed(1),
    totalHallucinations,
    hallucinationRate: ((totalHallucinations / metrics.length) * 100).toFixed(1),
    averageCitationCoverage: (avgCitation * 100).toFixed(1),
    highConfidenceCount: metrics.filter(m => m.confidence === 'high').length,
  };
}
```

---

## Example Output

### Validation Passed
```
[Validator] ✅ Synthesis passed validation {
  score: 95,
  confidence: 'high'
}
```

### Validation Failed
```
[Validator] ❌ Synthesis failed validation {
  score: 45,
  citedSources: 2,
  totalSources: 7,
  hallucinations: 3,
  ungroundedClaims: 8,
  confidence: 'low'
}

═══════════════════════════════════════════════════════════════════════════════
SYNTHESIS VALIDATION REPORT
═══════════════════════════════════════════════════════════════════════════════

Status: ❌ FAILED
Score: 45/100
Confidence: LOW

Sources:
  Total: 7
  Cited: 2
  Missing: 5

⚠️ Warning: Only 2/7 sources cited

🚨 Hallucinations Detected (3):
  • Statute reference not in sources: "Section 42A of the Labour Act"
  • Fabricated URL: "https://gov.zw/labour-laws"
  • Statute reference not in sources: "Act 2019"

⚠️ Ungrounded Claims (8):
  • Specific number not in sources: "$5,000"
  • Specific number not in sources: "2020-01-15"
  • Overconfident claim: "definitely requires compliance with..."
  ... and 5 more

═══════════════════════════════════════════════════════════════════════════════
```

---

## Integration Checklist

- [ ] Import validation functions in your workflow files
- [ ] Call `validateSynthesis()` after synthesis steps
- [ ] Log validation results for monitoring
- [ ] Add validation scores to workflow outputs (optional)
- [ ] Set up fallback logic based on validation scores (optional)
- [ ] Create quality metrics dashboard (optional)
- [ ] Display quality indicators to users (optional)

---

## Best Practices

1. **Always validate** - Even if you don't act on results, log them for analysis
2. **Set thresholds** - Decide what scores trigger fallbacks (e.g., < 60)
3. **Monitor trends** - Track average scores over time
4. **Investigate failures** - Review hallucinations to improve prompts
5. **Balance quality vs. UX** - Don't reject too many syntheses or users get frustrated

---

## Performance Notes

- Validation adds ~50-100ms overhead (negligible)
- Runs synchronously after synthesis
- No external API calls
- Regex-based pattern matching
- Memory efficient (doesn't store large data)

---

## Troubleshooting

### High False Positive Rate
If validator flags valid responses as invalid:
- Review pattern matching rules
- Adjust confidence thresholds
- Check if sources have all necessary content

### Low Detection Rate
If validator misses hallucinations:
- Add more pattern rules in `statutePatterns`
- Lower validation score threshold
- Check `ungroundedClaims` detection

### Performance Issues
If validation is slow:
- Reduce number of patterns checked
- Use `quickValidate()` instead of full validation
- Cache validation results

