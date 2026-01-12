import express from "express";
import fs from "fs";
import { execSync } from "child_process";
import { fetchAndDecryptBlob } from "./utils/walrusDecrypt.js";

const router = express.Router();

/**
 * POST /proof/age18
 * Original single-dataset AGE >= 18 proof (kept for compatibility)
 */
router.post("/", async (req, res) => {
  try {
    const { blobId, accessKey } = req.body;
    if (!blobId || !accessKey) {
      return res.status(400).json({ error: "Missing blobId or accessKey" });
    }

    // This route STILL expects encrypted blobs
    const registry = JSON.parse(
      fs.readFileSync("data/blob_key_registry.json", "utf8")
    );

    if (!registry[blobId] || !registry[blobId][accessKey]) {
      return res.status(403).json({
        error: "No decryption material for this blobId + role"
      });
    }

    const { keyHex, ivHex, authTagHex } = registry[blobId][accessKey];

    const binPath = fetchAndDecryptBlob({
      blobId,
      keyHex,
      ivHex,
      authTagHex
    });

    const output = execSync(
      `node proofs/age_over_18/prove_age18.js ${binPath}`,
      { encoding: "utf8" }
    );

    res.json(JSON.parse(output));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AGE ≥ 18 proof failed" });
  }
});

/**
 * POST /proof/age18/count
 * PLAINTEXT dataset count proof (NO REGISTRY, NO DECRYPTION)
 */
router.post("/count", async (req, res) => {
  try {
    const { blobId } = req.body;
    if (!blobId) {
      return res.status(400).json({ error: "Missing blobId" });
    }

    // 1. Fetch blob from Walrus (plaintext JSON stored as .bin)
    const binPath = `/tmp/${blobId}.bin`;
    execSync(
      `/usr/local/bin/walrus read ${blobId} --out ${binPath}`,
      { stdio: "inherit" }
    );

    if (!fs.existsSync(binPath)) {
      throw new Error("Walrus output file not found");
    }

    // 2. Run COUNT proof
    const output = execSync(
      `node proofs/age_over_18/prove_age18_count.js ${binPath}`,
      { encoding: "utf8" }
    );

    res.json({
      rule_id: "AGE_OVER_18_COUNT_V1",
      blobId,
      ...JSON.parse(output)
    });
  } catch (err) {
    console.error("AGE ≥ 18 COUNT proof error:", err.message);
    res.status(500).json({
      error: "AGE ≥ 18 COUNT proof failed",
      details: err.message
    });
  }
});

export default router;
