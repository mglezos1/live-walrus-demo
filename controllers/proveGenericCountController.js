// controllers/proveGenericCountController.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import * as snarkjs from "snarkjs";

import { buildCircuitInputs } from "../utils/buildCircuitInputs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function proveGenericCount(req, res) {
  try {
    console.log("▶ Generic count proof request received");

    const { dataset, conditions } = req.body;

    if (!dataset || !conditions) {
      return res.status(400).json({ error: "Missing dataset or conditions" });
    }

    // -----------------------------
    // Paths
    // -----------------------------
    const CIRCUIT_DIR = path.join(__dirname, "..", "circuits");
    const BUILD_DIR = path.join(__dirname, "..", "build");

    if (!fs.existsSync(BUILD_DIR)) {
      fs.mkdirSync(BUILD_DIR);
    }

    const witnessScript = path.join(
      CIRCUIT_DIR,
      "count_one_condition_js",
      "generate_witness.cjs"
    );

    const wasmPath = path.join(
      CIRCUIT_DIR,
      "count_one_condition_js",
      "count_one_condition.wasm"
    );

    const zkeyPath = path.join(
      CIRCUIT_DIR,
      "count_one_condition.zkey"
    );

    const inputPath = path.join(BUILD_DIR, "input_generic.json");
    const witnessPath = path.join(BUILD_DIR, "witness.wtns");

    // -----------------------------
    // Safety checks
    // -----------------------------
    if (!fs.existsSync(witnessScript)) {
      throw new Error("generate_witness.cjs not found");
    }
    if (!fs.existsSync(wasmPath)) {
      throw new Error("WASM file not found");
    }
    if (!fs.existsSync(zkeyPath)) {
      throw new Error("zkey file not found");
    }

    console.log("✔ All required files exist");

    // -----------------------------
    // Build inputs
    // -----------------------------
    const circuitInputs = buildCircuitInputs(dataset, conditions);
    fs.writeFileSync(inputPath, JSON.stringify(circuitInputs, null, 2));
    console.log("✔ Circuit inputs written");

    // -----------------------------
    // Generate witness
    // -----------------------------
    console.log("▶ Generating witness via generate_witness.cjs");

    execSync(
      `node ${witnessScript} ${wasmPath} ${inputPath} ${witnessPath}`,
      { stdio: "inherit" }
    );

    console.log("✔ Witness generated");

    // -----------------------------
    // Generate proof
    // -----------------------------
    console.log("▶ Generating Groth16 proof");

    const { proof, publicSignals } = await snarkjs.groth16.prove(
      zkeyPath,
      witnessPath
    );

    console.log("✔ Proof generated");

    return res.json({
      success: true,
      count: publicSignals[0],
      proof,
      publicSignals
    });

  } catch (err) {
    console.error("❌ Proof generation failed:", err.message);
    return res.status(500).json({
      error: "Proof generation failed",
      details: err.message
    });
  }
}
