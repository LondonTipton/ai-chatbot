// Test the Modal A10 GPU health endpoint
const MODAL_BASE_URL =
  process.env.MODAL_EMBEDDING_URL ||
  "https://chrismutibvu--legal-search-8b-fast-gpu-a10-fastgpusearch-ce0540.modal.run";

async function testHealthCheck() {
  console.log("Testing health check endpoint...");

  const healthUrl = `${MODAL_BASE_URL.replace(/\/$/, "")}/health`;

  try {
    const response = await fetch(healthUrl);
    if (!response.ok) {
      console.error(
        `Health check failed: ${response.status} ${response.statusText}`
      );
      const text = await response.text();
      console.error(text);
      return;
    }

    const data = await response.json();
    console.log("✅ Health check passed!");
    console.log(data);
  } catch (error) {
    console.error("Health check error:", error);
  }
}

testHealthCheck();
