import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Fetch encrypted blob from Walrus and return .bin path
 */
export function fetchAndDecryptBlob({ blobId, keyHex, ivHex, authTagHex }) {
  const outPath = `/tmp/${blobId}.bin`;

  // Fetch blob from Walrus
  execSync(
    `/usr/local/bin/walrus read ${blobId} --out ${outPath}`,
    { stdio: "inherit" }
  );

  if (!fs.existsSync(outPath)) {
    throw new Error("Walrus read failed: .bin not found");
  }

  // 🔒 OPTIONAL PLACEHOLDER:
  // If you later want AES-GCM decrypt, it happens HERE.
  // Right now datasets are plaintext JSON stored as binary.

  return outPath;
}
