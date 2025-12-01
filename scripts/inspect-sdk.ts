import { MilvusClient } from "@zilliz/milvus2-sdk-node";

const ZILLIZ_URI = process.env.ZILLIZ_URI!;
const ZILLIZ_TOKEN = process.env.ZILLIZ_TOKEN!;

async function inspectSDK() {
  const client = new MilvusClient({
    address: ZILLIZ_URI,
    token: ZILLIZ_TOKEN,
  });

  console.log("Methods on MilvusClient:");
  const proto = Object.getPrototypeOf(client);
  Object.getOwnPropertyNames(proto).forEach((name) => {
    console.log(`- ${name}`);
  });

  // Also check instance properties
  console.log("\nInstance properties:");
  Object.getOwnPropertyNames(client).forEach((name) => {
    console.log(`- ${name}`);
  });
}

inspectSDK();
