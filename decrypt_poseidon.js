import fs from "fs";
import { execSync } from "child_process";
import crypto from "crypto";
import * as circomlib from "circomlibjs";

async function main() {
  // 1. Load metadata
  const metadata = JSON.parse(fs.readFileSync("metadata.json", "utf8"));

  const blobId = metadata.walrus.blobId;
  const keyHex = metadata.encryption.keyHex;
  const ivHex = metadata.encryption.ivHex;
  const authTagHex = metadata.encryption.authTagHex;
  const poseidonDecimal = metadata.hashing.poseidonDecimal;

  if (!blobId) {
    console.error("❌ ERROR: Blob ID missing from metadata.json");
    process.exit(1);
  }

  console.log("🔽 Downloading encrypted blob from Walrus...");
  execSync(
    `walrus read ${blobId} --wallet /root/.sui/sui_config/client.yaml --out encrypted_downloaded.bin`,
    { stdio: "inherit" }
  );

  // 2. Verify Poseidon hash of downloaded data
  console.log("🔢 Verifying Poseidon hash...");
  const poseidon = await circomlib.buildPoseidon();

  const encryptedBuffer = fs.readFileSync("encrypted_downloaded.bin");

  // Turn buffer into a BigInt input
  const inputBigInt = BigInt("0x" + encryptedBuffer.toString("hex"));

  // Compute Poseidon hash
  const hashBigInt = poseidon.F.toObject(poseidon([inputBigInt]));
  const computedHash = hashBigInt.toString(10);

  if (computedHash !== poseidonDecimal) {
    console.error("❌ Poseidon hash mismatch! Data integrity compromised.");
    console.error("Expected:", poseidonDecimal);
    console.error("Got     :", computedHash);
    process.exit(1);
  }

  console.log("✅ Poseidon hash VERIFIED.");

  // 3. Decrypt with AES-256-GCM
  console.log("🔐 Decrypting file...");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyHex, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  fs.writeFileSync("decrypted.txt", decrypted);
  console.log("📄 Decrypted file saved: decrypted.txt");
}

main().catch((err) => {
  console.error("❌ Unexpected error in decrypt_poseidon.js:", err);
  process.exit(1);
});

