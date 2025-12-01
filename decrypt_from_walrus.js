import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

// AES-GCM Decrypt
function decryptFile(encrypted, keyHex, ivHex, authTagHex) {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted;
}

// Fetch from Walrus
function fetchBlob(blobId) {
  console.log("⬇️ Fetching encrypted blob...");

  // save to temp
  const out = "/tmp/downloaded.bin";

  execSync(
    `walrus read ${blobId} \
      --wallet /root/.sui/sui_config/client.yaml \
      --out ${out}`,
    { stdio: "inherit" }
  );

  return fs.readFileSync(out);
}

// MAIN
(async () => {
  const blobId = process.argv[2];
  const key = process.argv[3];
  const iv = process.argv[4];
  const authTag = process.argv[5];

  if (!blobId || !key || !iv || !authTag) {
    console.log("\nUsage:");
    console.log(" node decrypt_from_walrus.js <BLOB_ID> <KEYHEX> <IVHEX> <AUTHTAGHEX>\n");
    process.exit(1);
  }

  const encrypted = fetchBlob(blobId);
  console.log("🔐 Decrypting...");

  const plaintext = decryptFile(encrypted, key, iv, authTag);
  fs.writeFileSync("decrypted.txt", plaintext);

  console.log("\n✅ Decryption complete! Write to decrypted.txt");
})();
