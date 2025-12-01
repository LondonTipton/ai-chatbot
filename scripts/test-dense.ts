// Test the Modal A10 GPU embed endpoint
const MODAL_BASE_URL =
  process.env.MODAL_EMBEDDING_URL ||
  "https://chrismutibvu--legal-search-8b-fast-gpu-a10-fastgpusearch-ce0540.modal.run";

async function testDenseOnly() {
  console.log("Testing dense endpoint...");

  const embedUrl = `${MODAL_BASE_URL.replace(/\/$/, "")}/embed`;

  const response = await fetch(embedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries: ["test contract"] }),
  });

  if (!response.ok) {
    console.error(
      `Dense endpoint failed: ${response.status} ${response.statusText}`
    );
    const text = await response.text();
    console.error(text);
    return;
  }

  const data = await response.json();
  console.log("✅ Dense endpoint working!");
  console.log(`Response:`, JSON.stringify(data, null, 2).substring(0, 500));
}

testDenseOnly();
