import express from "express";
import fs from "fs";
import { execSync } from "child_process";
import { fetchAndDecryptBlob } from "./utils/walrusDecrypt.js";

const router = express.Router();

/**
 * POST /proof/age18/count
 * Body:
 * {
 *   "blobId": "...",
 *   "accessKey": "doctor" | "research"
 * }
 */
router.post("/", async (req, res) => {
  try {
    const { blobId, accessKey } = req.body;

    if (!blobId || !accessKey) {
      return res.status(400).json({
        error: "Required fields: blobId, accessKey"
      });
    }

    // Load key registry
    const registry = JSON.parse(
      fs.readFileSync("data/blob_key_registry.json", "utf8")
    );

    const entry = registry[blobId]?.[accessKey];
    if (!entry) {
      return res.status(403).json({
        error: "No decryption material for this blobId + role"
      });
    }

    // 1. Fetch + decrypt dataset
    const datasetPath = fetchAndDecryptBlob({
      blobId,
      keyHex: entry.keyHex,
      ivHex: entry.ivHex,
      authTagHex: entry.authTagHex
    });

    // 2. Run COUNT proof
    const output = execSync(
      `node proofs/age_over_18/prove_age18_count.js ${datasetPath}`,
      { encoding: "utf8" }
    );

    const result = JSON.parse(output);

    res.json(result);

  } catch (err) {
    console.error("AGE ≥ 18 COUNT error:", err);
    res.status(500).json({
      error: "AGE ≥ 18 COUNT proof failed",
      details: err.message
    });
  }
});

export default router;
