// controllers/proveGenericCountController.js

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { buildCircuitInputs } from "../utils/buildCircuitInputs.js";
import { generateWitness, generateProof } from "../utils/zk_fixed.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function proveGenericCount(req, res) {
  try {
    const { dataset, conditions } = req.body;

    const N = 10; // number of records
    const C = 3;  // max conditions

    const input = buildCircuitInputs({
      dataset,
      conditions,
      N,
      C
    });

    const inputPath = path.join(__dirname, "../build/input_generic.json");
    const witnessPath = path.join(__dirname, "../build/witness_generic.wtns");

    await fs.writeFile(inputPath, JSON.stringify(input, null, 2));

    const wasmPath = path.join(
      __dirname,
      "../circuits/count_one_condition_js/count_one_condition.wasm"
    );

    const zkeyPath = path.join(
      __dirname,
      "../circuits/count_one_condition.zkey"
    );

    await generateWitness(wasmPath, inputPath, witnessPath);
    const { proof, publicSignals } = await generateProof(zkeyPath, witnessPath);

    res.json({
      count: publicSignals[0],
      publicSignals,
      proof
    });

  } catch (err) {
    console.error("❌ Generic proof error:", err);
    res.status(500).json({ error: err.message });
  }
}
