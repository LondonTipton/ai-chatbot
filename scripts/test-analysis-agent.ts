/**
 * Test script for Analysis Agent
 *
 * Tests the analysis agent's ability to:
 * 1. Provide comprehensive legal analysis
 * 2. Preserve citations
 * 3. Emphasize Zimbabwe legal context
 * 4. Use summarize tool when needed
 * 5. Maintain professional writing standards
 *
 * Usage: npx tsx scripts/test-analysis-agent.ts
 */

import { analysisAgent } from "@/mastra/agents/analysis-agent";

async function testAnalysisAgent() {
  console.log("=".repeat(80));
  console.log("ANALYSIS AGENT TEST");
  console.log("=".repeat(80));
  console.log();

  // Test 1: Comprehensive Analysis
  console.log("Test 1: Comprehensive Legal Analysis");
  console.log("-".repeat(80));

  const test1Input = `Create a comprehensive analysis document for contract law in Zimbabwe:

## Research Results

### Contract Formation
Contract law in Zimbabwe is based on Roman-Dutch common law principles and supplemented by the Sale of Goods Act [Chapter 8:27]. A valid contract requires:
1. Offer - a clear proposal to enter into a contract
2. Acceptance - unequivocal agreement to the terms
3. Consideration - something of value exchanged
4. Intention to create legal relations - parties must intend to be legally bound
5. Capacity - parties must have legal capacity to contract

### Case Law
In *Bishi v Lovemore* (2015) the Supreme Court held that acceptance must be communicated to the offeror. The court emphasized that silence cannot constitute acceptance unless there is a prior course of dealing.

### Statutory Framework
The Sale of Goods Act [Chapter 8:27] governs contracts for the sale of goods. Section 3 defines a contract of sale as a contract whereby the seller transfers or agrees to transfer the property in goods to the buyer for a money consideration called the price.

### Practical Implications
Zimbabwe courts strictly enforce the requirement of consensus ad idem (meeting of minds). Contracts entered into under duress, fraud, or misrepresentation are voidable.

Sources:
- [Zimbabwe Legal Information Institute - Contract Law](https://zimlii.org/zw/judgment/supreme-court/2015/1)
- [Sale of Goods Act Chapter 8:27](https://veritaszim.net/node/1234)
- [Bishi v Lovemore 2015 (1) ZLR 45 (SC)](https://zimlii.org/zw/judgment/supreme-court/2015/1)`;

  try {
    const response1 = await analysisAgent.generate(test1Input, {
      maxSteps: 1,
    });

    console.log("Response:");
    console.log(response1.text);
    console.log();
    console.log("Metadata:");
    console.log(`- Steps used: ${response1.steps?.length || 0}`);
    console.log(`- Response length: ${response1.text.length} characters`);
    console.log(
      `- Contains citations: ${
        response1.text.includes("http") || response1.text.includes("[")
      }`
    );
    console.log(
      `- Contains Zimbabwe context: ${response1.text
        .toLowerCase()
        .includes("zimbabwe")}`
    );
    console.log(`- Has structure (headers): ${response1.text.includes("#")}`);
    console.log();
  } catch (error) {
    console.error("Test 1 failed:", error);
  }

  // Test 2: Citation Preservation
  console.log("Test 2: Citation Preservation");
  console.log("-".repeat(80));

  const test2Input = `Analyze employment law in Zimbabwe:

The Labour Act [Chapter 28:01] is the primary legislation governing employment relationships in Zimbabwe. Key provisions include:

- Section 12: Employment contracts must be in writing
- Section 12A: Minimum notice periods for termination
- Section 12B: Grounds for dismissal

Recent case law:
- *Zuva Petroleum v Mupfumi* (2020) - Court held that procedural fairness is required in dismissals
- *Econet v Mpofu* (2019) - Constructive dismissal principles established

Sources:
- [Labour Act Chapter 28:01](https://veritaszim.net/labour-act)
- [Zuva Petroleum v Mupfumi 2020 (2) ZLR 123 (SC)](https://zimlii.org/zw/judgment/supreme-court/2020/5)
- [Econet v Mpofu 2019 (1) ZLR 89 (LC)](https://zimlii.org/zw/judgment/labour-court/2019/3)`;

  try {
    const response2 = await analysisAgent.generate(test2Input, {
      maxSteps: 1,
    });

    console.log("Response:");
    console.log(response2.text);
    console.log();
    console.log("Citation Check:");
    console.log(
      `- Contains Labour Act reference: ${response2.text.includes(
        "Labour Act"
      )}`
    );
    console.log(
      `- Contains case citations: ${
        response2.text.includes("Zuva") || response2.text.includes("Econet")
      }`
    );
    console.log(
      `- Contains URLs: ${
        response2.text.includes("http") ||
        response2.text.includes("zimlii") ||
        response2.text.includes("veritaszim")
      }`
    );
    console.log(
      `- Has sources section: ${
        response2.text.toLowerCase().includes("source") ||
        response2.text.toLowerCase().includes("reference")
      }`
    );
    console.log();
  } catch (error) {
    console.error("Test 2 failed:", error);
  }

  // Test 3: Tool Usage (Summarize)
  console.log("Test 3: Tool Usage - Summarize Long Content");
  console.log("-".repeat(80));

  const longContent = `Analyze this comprehensive research on Zimbabwe constitutional law:

${"The Constitution of Zimbabwe (2013) is the supreme law of the land. ".repeat(
  50
)}

Chapter 4 contains the Declaration of Rights, which includes:
- Right to life (Section 48)
- Right to personal liberty (Section 49)
- Right to human dignity (Section 51)
- Freedom from torture (Section 53)
- Right to property (Section 71)

${"These rights are fundamental and can only be limited in terms of Section 86. ".repeat(
  30
)}

Key constitutional cases:
- *Mudzuru v Minister of Justice* (2016) - Child marriages declared unconstitutional
- *Jealous Mawarire v Mugabe* (2016) - Right to demonstrate upheld

${"The Constitutional Court is the highest court on constitutional matters. ".repeat(
  20
)}

Sources:
- [Constitution of Zimbabwe 2013](https://zimlii.org/zw/legislation/act/2013/1)
- [Mudzuru v Minister of Justice CCZ 12/15](https://zimlii.org/zw/judgment/constitutional-court/2016/1)`;

  try {
    const response3 = await analysisAgent.generate(longContent, {
      maxSteps: 2, // Allow tool usage
    });

    console.log("Response:");
    console.log(response3.text.substring(0, 1000) + "...");
    console.log();
    console.log("Tool Usage Check:");
    console.log(`- Steps used: ${response3.steps?.length || 0}`);
    console.log(
      `- Tool calls: ${
        response3.steps?.filter((s) => s.toolCalls && s.toolCalls.length > 0)
          .length || 0
      }`
    );
    console.log(`- Response length: ${response3.text.length} characters`);
    console.log(
      `- Contains constitutional content: ${response3.text
        .toLowerCase()
        .includes("constitution")}`
    );
    console.log();
  } catch (error) {
    console.error("Test 3 failed:", error);
  }

  console.log("=".repeat(80));
  console.log("ANALYSIS AGENT TEST COMPLETE");
  console.log("=".repeat(80));
}

// Run tests
testAnalysisAgent().catch(console.error);
