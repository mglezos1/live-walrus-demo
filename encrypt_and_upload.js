// encrypt_and_upload.js
// AES-256-GCM client-side encryption + Walrus upload

import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

// 1. AES-GCM Encrypt a file
function encryptFile(filePath, key) {
  const data = fs.readFileSync(filePath);

  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { encrypted, iv, authTag };
}

// 2. Upload encrypted file to Walrus using the CLI
function uploadToWalrus(fileBuffer) {
  const temp = "/tmp/encrypted.bin";
  fs.writeFileSync(temp, fileBuffer);

  console.log("🔵 Encrypting and uploading to Walrus...");

  const output = execSync(
    `walrus store ${temp} \
      --wallet /root/.sui/sui_config/client.yaml \
      --gas-budget 20000000 \
      --epochs 5 \
      --json`,
    { encoding: "utf8" }
  );

  return JSON.parse(output)[0];
}

// MAIN
(async () => {
  const filePath = "test.txt";

  console.log("🔐 Generating AES-256 key...");
  const key = crypto.randomBytes(32); // 256-bit key

  console.log("🔐 Encrypting file...");
  const { encrypted, iv, authTag } = encryptFile(filePath, key);

  console.log("⬆️ Uploading encrypted blob to Walrus...");
  const result = uploadToWalrus(encrypted);

  console.log("\n✅ UPLOAD COMPLETE");
  console.log("Blob ID:", result.blobStoreResult.newlyCreated.blobObject.blobId);

  console.log("\n🔐 Save these (user needs them to decrypt):");
  console.log("AES key (hex):", key.toString("hex"));
  console.log("IV (hex):", iv.toString("hex"));
  console.log("Auth Tag (hex):", authTag.toString("hex"));
})();
