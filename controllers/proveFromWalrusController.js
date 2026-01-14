// controllers/proveFromWalrusController.js

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * PROOF TYPE REGISTRY
 * Each entry defines how to generate a proof
 * for a given proofType.
 */
const PROOF_TYPES = {
  count_under_18_diabetes: {
    wasm: "circuits/juvenile_diabetes_under_18_count_10_js/juvenile_diabetes_under_18_count_10.wasm",
    witnessGen: "circuits/juvenile_diabetes_under_18_count_10_js/generate_witness.cjs",
    zkey: "circuits/juvenile_diabetes_under_18_count_10.zkey",
    maxRecords: 10,

    /**
     * Map dataset → circuit inputs
     */
    mapInputs(dataset) {
      const ages = [];
      const conditions = [];

      for (let i = 0; i < this.maxRecords; i++) {
        const row = dataset[i] || {};
        ages.push(Number(row.age || 0));
        conditions.push(row.condition === "diabetes" ? 1 : 0);
      }

      return { ages, conditions };
    }
  }
};

/**
 * Main proof controller
 */
export async function proveFromWalrusController(req, res) {
  try {
    const { blobId, proofType } = req.body;

    if (!blobId || !proofType) {
      return res.status(400).json({
        error: "blobId and proofType are required"
      });
    }

    const config = PROOF_TYPES[proofType];
    if (!config) {
      return res.status(400).json({
        error: `Unsupported proofType: ${proofType}`
      });
    }

    // -------------------------
    // 1️⃣ Download dataset
    // -------------------------
    const downloadsDir = path.join(__dirname, "../downloads");
    await fs.mkdir(downloadsDir, { recursive: true });

    const datasetPath = path.join(downloadsDir, `${blobId}.json`);
    await execAsync(
      `walrus read ${blobId} --wallet ~/.sui/sui_config/client.yaml > ${datasetPath}`
    );

    const dataset = JSON.parse(
      await fs.readFile(datasetPath, "utf8")
    );

    if (!Array.isArray(dataset)) {
      return res.status(400).json({ error: "Dataset must be an array" });
    }

    // -------------------------
    // 2️⃣ Map inputs
    // -------------------------
    const input = config.mapInputs(dataset);
    const inputPath = path.join(downloadsDir, "input.json");

    await fs.writeFile(inputPath, JSON.stringify(input, null, 2));

    // -------------------------
    // 3️⃣ Generate witness
    // -------------------------
    const witnessPath = path.join(downloadsDir, "witness.wtns");

    const witnessCmd = `
node ${config.witnessGen} \
${config.wasm} \
${inputPath} \
${witnessPath}
`.trim();

    await execAsync(witnessCmd);

    // -------------------------
    // 4️⃣ Generate proof
    // -------------------------
    const proofPath = path.join(downloadsDir, "proof.json");
    const publicPath = path.join(downloadsDir, "public.json");

    const proveCmd = `
snarkjs groth16 prove \
${config.zkey} \
${witnessPath} \
${proofPath} \
${publicPath}
`.trim();

    await execAsync(proveCmd);

    const proof = JSON.parse(await fs.readFile(proofPath, "utf8"));
    const publicSignals = JSON.parse(await fs.readFile(publicPath, "utf8"));

    // -------------------------
    // 5️⃣ Return
    // -------------------------
    return res.json({
      message: "✅ ZK proof generated",
      blobId,
      proofType,
      result: Number(publicSignals[0]),
      publicSignals,
      proof
    });

  } catch (err) {
    console.error("proveFromWalrusController error:", err);
    return res.status(500).json({
      error: "Proof generation failed",
      details: err.message
    });
  }
}
