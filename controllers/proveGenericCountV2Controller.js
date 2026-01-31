import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import * as snarkjs from "snarkjs";
import { fileURLToPath } from "url";

import { buildCircuitInputs } from "../utils/buildCircuitInputs.js";
import { verifyCapability } from "../utils/capability.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function proveGenericCountV2(req, res) {
  try {
    const { dataset, conditions, capability } = req.body;

    if (!dataset || !conditions || !capability) {
      return res.status(400).json({
        error: "Missing dataset, conditions, or capability",
      });
    }

    // -----------------------------
    // Verify capability
    // -----------------------------
    const cap = verifyCapability(capability);
    const role = cap.role;

    console.log(`[V2] Capability verified for role: ${role}`);

    // -----------------------------
    // Build circuit inputs
    // -----------------------------
    const input = buildCircuitInputs(dataset, conditions, {
      version: "v2",
    });

    const buildDir = path.join(__dirname, "..", "build");
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir);
    }

    const inputPath = path.join(buildDir, "input_generic_v2.json");
    const witnessPath = path.join(buildDir, "witness_v2.wtns");

    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));

    // -----------------------------
    // Circuit paths
    // -----------------------------
    const circuitDir = path.join(
      __dirname,
      "..",
      "circuits",
      "count_v2_js"
    );

    const wasmPath = path.join(circuitDir, "count_v2.wasm");
    const witnessGenPath = path.join(
      circuitDir,
      "generate_witness.cjs"
    );

    const zkeyPath = path.join(
      __dirname,
      "..",
      "circuits",
      "count_v2.zkey"
    );

    // -----------------------------
    // Witness + proof
    // -----------------------------
    execSync(
      `node ${witnessGenPath} ${wasmPath} ${inputPath} ${witnessPath}`,
      { stdio: "inherit" }
    );

    const { proof, publicSignals } = await snarkjs.groth16.prove(
      zkeyPath,
      witnessPath
    );

    return res.json({
      success: true,
      role,
      count: publicSignals[0],
      proof,
      publicSignals,
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      error: "Capability verification failed",
      details: err.message,
    });
  }
}
