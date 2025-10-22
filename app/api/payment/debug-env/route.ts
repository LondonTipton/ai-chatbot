import { NextResponse } from "next/server";

export async function GET() {
  const integrationKey = process.env.PESEPAY_INTEGRATION_KEY;
  const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY;

  return NextResponse.json({
    hasIntegrationKey: !!integrationKey,
    integrationKeyLength: integrationKey?.length || 0,
    integrationKeyPreview: integrationKey
      ? `${integrationKey.substring(0, 8)}...`
      : "missing",
    hasEncryptionKey: !!encryptionKey,
    encryptionKeyLength: encryptionKey?.length || 0,
    encryptionKeyPreview: encryptionKey
      ? `${encryptionKey.substring(0, 8)}...`
      : "missing",
    // Test if key works with crypto
    keyTest: (() => {
      if (!encryptionKey) return "no key";
      try {
        const { createCipheriv } = require("crypto");
        const { Buffer } = require("buffer");
        const iv = Buffer.from(encryptionKey.substr(0, 16), "utf8");
        const keyBuffer = Buffer.from(encryptionKey, "utf8");
        const cipher = createCipheriv("aes-256-cbc", keyBuffer, iv);
        return "valid";
      } catch (error: any) {
        return `invalid: ${error.message}`;
      }
    })(),
  });
}
