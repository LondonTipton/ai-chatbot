// Decrypt the Pesepay response
const { createDecipheriv } = require("crypto");
const { Buffer } = require("buffer");

const encryptionKey = "e16c46c66cdc41288c7f859bcf33cf31";

const encryptedResponse =
  "XdHTc7u/cXL6/x4GyBbABjLPCrzlhVD/M0OIRLbhHgboWDGoK83ecT0e/7VJ8kHH0tPTFEefuoHUHrPdt2Qm3e3taTiWM9hxnTKNry5S97yQy+cxd0ySearhj1rn60lJPjIAzcXlLyeR+CV0AxrETjJ8Dciby3G8cqcjHfGkCrfRza0I+v8ukcoJ9rVD+OAi5Qd7oOje8STtO5fX/GwZJSrjfSBsfYMrtSoYeJfpYMM5Y7l4yGJigo1pbfarzWYH7sgyU+rrvIOX1ALBeJ8p1TXCRDc6pjgJbkPdFeMNlA8OaASrK3yFwDnnsUX15Xk80nwnNP+ogEXvQKYzSEke7UJs/Llxj4LQRkgwo7o12pXOm7J7MY5dYQnjmVzEnmUzbxO+M2egI3jetfsybivfbnIrH6a1Hmp234xh0WVUncbfmTrZCfEXz0rfsHYvsDOUjJY+MvLUlIUkq4xh5rG0wRx/RpJiFQKWQc/Btk6w2tb9bnmYq5aVZXNjDQpTinelq/OMxYtX7LV6s2cHHatuRdSz4x1eiXaT7mHLz2ZP07psHcoktQlk83hMLz6WGwQjTfBm09YShZJWZEPR3hmz/X78YUDSIaTmV0jHnU8v6NuimokFs1RIwAfeQwfUU04L8JJnNfeH0kVKKowOjkUXZ/Xff96aqUX/wF/ZWlnONPGFhjqCpRWWeVzZrmqX2jTrQ2pwAKeBnfGreTm/JGnexOxzChT1125+QpLrSbl67GnVWmzMi1obEgLnkm4A6Wq+WLMBgS2SjebjErliXJez4L4rfqtz4xseH1cixujgsf6yh5GZIP1NnFskhH+DoFsuvRIJR4l0Lzt6DU1xU6fTkdyCZt7gTPM7fBAx0jevIOn/NMJyrjIrcIUYh17ibjjDfEvcyswi/wfrZ5PIW/vHkBOrEv+UPMDwhyweSZZklJvavdLkn1COtCotNzRK7sQ6PvhQc9AmwlyV2KB0NJKQWB/33pCMuh/ebn7Cb6hdujva90ZMgaYQvWPOvMDx73yX4vwOb5r8RHtJFtT1Lucx3Gwa/dLH1fAFo/LIg+5WXLc=";

function payloadDecrypt(payload: string, key: string) {
  const iv = Buffer.from(key.substr(0, 16), "utf8");
  const keyBuffer = Buffer.from(key, "utf8");
  const decipher = createDecipheriv("aes-256-cbc", keyBuffer, iv);
  return decipher.update(payload, "base64", "utf8") + decipher.final("utf8");
}

try {
  const decrypted = payloadDecrypt(encryptedResponse, encryptionKey);
  console.log("Decrypted response:");
  console.log(JSON.stringify(JSON.parse(decrypted), null, 2));
} catch (error: any) {
  console.error("Error decrypting:", error.message);
}
