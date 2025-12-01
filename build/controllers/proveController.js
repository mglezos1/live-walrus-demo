// controllers/proveController.js

import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

import { computeCommitment } from "../utils/commitment.mjs";
import { generateWitness, generateProof } from "../utils/zk_fixed.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function proveController(req, res) {
  try {
    const { patientId, testNonce, result } = req.body;

    if (patientId === undefined || testNonce === undefined || result === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Compute Poseidon commitment (BigInt → string)
    const commitmentBig = await computeCommitment(patientId, testNonce, result);
    const commitment = commitmentBig.toString();

    // Build input.json (must match Circom circuit inputs exactly)
    const input = {
      patientId,
      testNonce,
      result,
      commitment,
      claimedResult: result
    };

    const inputPath = path.join(__dirname, "../build/input.json");
    await fs.writeFile(inputPath, JSON.stringify(input));

    // Paths for proving system
    const wasm = path.join(__dirname, "../build/covid_result_js/covid_result.wasm");
    const witness = path.join(__dirname, "../build/witness.wtns");
    const zkey = path.join(__dirname, "../build/covid_result_final.zkey");
    const publicJson = path.join(__dirname, "../build/public.json");

    // 1. Generate witness
    await generateWitness(wasm, inputPath, witness);

    // 2. Generate Groth16 proof
    const { proof, publicSignals } = await generateProof(zkey, witness);

    // Save public signals
    await fs.writeFile(publicJson, JSON.stringify(publicSignals));

    return res.json({
      commitment,
      proof,
      publicSignals
    });

  } catch (err) {
    console.error("🔥 proveController error:", err);
    return res.status(500).json({ error: err.message });
  }
}
