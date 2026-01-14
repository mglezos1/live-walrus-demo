// controllers/proveController.js

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { generateWitness, generateProof } from "../utils/zk_fixed.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------------------------------
// Proof Type 1: count_under_18_diabetes
// --------------------------------------------------
export async function generateJuvenileDiabetesUnder18CountProof(blobId) {
  try {
    const inputPath = path.join(__dirname, "../input_juvenile_diabetes.json");

    const wasmPath = path.join(
      __dirname,
      "../circuits/juvenile_diabetes_under_18_count_10_js/juvenile_diabetes_under_18_count_10.wasm"
    );

    const zkeyPath = path.join(
      __dirname,
      "../circuits/juvenile_diabetes_under_18_count_10.zkey"
    );

    const witnessPath = path.join(
      __dirname,
      "../witness_juvenile_diabetes.wtns"
    );

    await generateWitness(wasmPath, inputPath, witnessPath);
    const { proof, publicSignals } = await generateProof(zkeyPath, witnessPath);

    return {
      count: Number(publicSignals[0]),
      total: 10,
      publicSignals,
      proof
    };
  } catch (err) {
    throw new Error(`ZK proof failed: ${err.message}`);
  }
}

// --------------------------------------------------
// Proof Type 2: count_over_18
// --------------------------------------------------
export async function generateAgeOver18CountProof(blobId) {
  try {
    const inputPath = path.join(__dirname, "../input_age_over_18.json");

    const wasmPath = path.join(
      __dirname,
      "../circuits/age_over_18_count_10_js/age_over_18_count_10.wasm"
    );

    const zkeyPath = path.join(
      __dirname,
      "../circuits/age_over_18_count_10.zkey"
    );

    const witnessPath = path.join(
      __dirname,
      "../witness_age_over_18.wtns"
    );

    await generateWitness(wasmPath, inputPath, witnessPath);
    const { proof, publicSignals } = await generateProof(zkeyPath, witnessPath);

    return {
      count: Number(publicSignals[0]),
      total: 10,
      publicSignals,
      proof
    };
  } catch (err) {
    throw new Error(`ZK proof failed: ${err.message}`);
  }
}
