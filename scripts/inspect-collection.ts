import { MilvusClient } from "@zilliz/milvus2-sdk-node";

const ZILLIZ_URI = process.env.ZILLIZ_URI!;
const ZILLIZ_TOKEN = process.env.ZILLIZ_TOKEN!;
const ZILLIZ_COLLECTION =
  process.env.ZILLIZ_COLLECTION || "hybrid_caselaw_collection";

async function inspectCollection() {
  const client = new MilvusClient({
    address: ZILLIZ_URI,
    token: ZILLIZ_TOKEN,
  });

  try {
    console.log(`Inspecting collection: ${ZILLIZ_COLLECTION}`);
    const schema = await client.describeCollection({
      collection_name: ZILLIZ_COLLECTION,
    });

    console.log("Schema:", JSON.stringify(schema, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

inspectCollection();
