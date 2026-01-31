import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

import { getDataset } from "../datasetRegistry.js";
import { getCapability } from "../capabilityRegistry.js";

export default function proveParamCount(req, res) {
  const { datasetId, capabilityId, values } = req.body;

  if (!datasetId || !capabilityId || !Array.isArray(values)) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  if (values.length !== 10) {
    return res.status(400).json({ error: "values must be length 10" });
  }

  const dataset = getDataset(datasetId);
  if (!dataset) {
    return res.status(404).json({ error: "Dataset not found" });
  }

  const capability = getCapability(capabilityId);
  if (!capability) {
    return res.status(404).json({ error: "Capability not found" });
  }

  // --- hash datasetId ---
  const datasetIdHash = parseInt(
    crypto
      .createHash("sha256")
      .update(datasetId)
      .digest("hex")
      .slice(0, 8),
    16
  );

  // --- build circuit input (MUST MATCH CIRCUIT EXACTLY) ---
  const input = {
    datasetIdHash,
    datasetRoot: dataset.datasetRoot,
    capabilityDatasetIdHash: capability.datasetIdHash,
    capabilityFieldIndex: capability.fieldIndex,      // REQUIRED EVEN IF UNUSED
    capabilityExpectedValue: capability.expectedValue,
    values
  };

  fs.writeFileSync(
    "input_param_count.json",
    JSON.stringify(input)
  );

  // --- generate witness ---
  execSync(`
    snarkjs wtns calculate \
      circuits/capability_param_count_v2_js/capability_param_count_v2.wasm \
      input_param_count.json \
      witness_param_count.wtns
  `);

  // --- generate proof ---
  execSync(`
    snarkjs groth16 prove \
      capability_param_count_v2.zkey \
      witness_param_count.wtns \
      proof_param_count.json \
      public_param_count.json
  `);

  const proof = JSON.parse(
    fs.readFileSync("proof_param_count.json")
  );
  const publicSignals = JSON.parse(
    fs.readFileSync("public_param_count.json")
  );

  res.json({ proof, publicSignals });
}
