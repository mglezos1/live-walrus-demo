import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { computePoseidonHash } from "../utils/compute_poseidon.mjs";
import { readBlob } from "../utils/walrus.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function verifyController(req, res) {
  try {
    const blobId = req.params.id;
    const metadataPath = path.join(__dirname, "../data", `${blobId}.json`);

    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: "Metadata for this blobId not found" });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath));

    // Download encrypted blob
    const downloadPath = path.join(
      __dirname,
      "../tmp",
      `verify_${blobId}.bin`
    );

    await readBlob(blobId, downloadPath);

    // Compute Poseidon hash of encrypted blob
    const fileBuffer = fs.readFileSync(downloadPath);
    const computed = await computePoseidonHash(fileBuffer);

    const match = computed === metadata.poseidonHash;

    return res.json({
      blobId,
      expectedPoseidon: metadata.poseidonHash,
      computedPoseidon: computed,
      match
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: err.message });
  }
}
