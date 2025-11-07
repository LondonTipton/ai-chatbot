/**
 * Direct Tavily API test for Zuva case
 * Run with: node test-tavily-zuva.js
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

async function testTavilySearch(query) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing query: "${query}"`);
  console.log("=".repeat(80));

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: 20,
        search_depth: "advanced",
        include_domains: [
          "zimlii.org",
          "saflii.org",
          "africanlii.org",
          "veritaszim.net",
          "parlzim.gov.zw",
        ],
      }),
    });

    const data = await response.json();

    console.log(`\nResults found: ${data.results?.length || 0}`);
    console.log(`Answer: ${data.answer || "No answer"}\n`);

    if (data.results && data.results.length > 0) {
      console.log("Top results:");
      data.results.slice(0, 5).forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Score: ${result.score}`);
        console.log(`   Content: ${result.content.substring(0, 200)}...`);
      });
    } else {
      console.log("❌ NO RESULTS FOUND");
    }

    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function main() {
  if (!TAVILY_API_KEY) {
    console.error("❌ TAVILY_API_KEY not set in environment");
    process.exit(1);
  }

  // Test different query variations
  await testTavilySearch(
    "zuva case Zimbabwe Supreme Court Labour Act employment judgment"
  );
  await testTavilySearch("Don Nyamande v Zuva Petroleum Zimbabwe");
  await testTavilySearch("Zuva Petroleum Zimbabwe Supreme Court SC 43/15");
  await testTavilySearch("Nyamande Zuva Labour Act Section 12B");
  await testTavilySearch("zuva petroleum labour law zimbabwe");
}

main();
