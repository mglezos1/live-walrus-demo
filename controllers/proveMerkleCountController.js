import fs from "fs";
import { execSync } from "child_process";
import { getDataset } from "../utils/datasetRegistry.js";

// BigInt-safe JSON
function serialize(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, v) =>
      typeof v === "bigint" ? v.toString() : v
    )
  );
}

export default async function proveMerkleCount(req, res) {
  try {
    const { datasetId, capability } = req.body;
    const cap = typeof capability === "string"
      ? JSON.parse(capability)
      : capability;

    if (!datasetId || !cap) {
      return res.status(400).json({ error: "Missing datasetId or capability" });
    }

    // Enforce allowed proof
    if (![1, 2].includes(cap.proofType)) {
      return res.status(403).json({
        error: "Capability does not allow this proof type"
      });
    }

    const dataset = getDataset(datasetId);
    if (!dataset) {
      return res.status(404).json({ error: "Dataset not found" });
    }

    const input = serialize({
      datasetIdHash: dataset.datasetIdHash,
      queryType: cap.proofType,
      datasetRoot: dataset.datasetRoot,
      capabilityDatasetIdHash: cap.datasetIdHash,
      capabilityAllowedQuery: cap.proofType,
      values: dataset.values
    });

    fs.writeFileSync(
      "input_merkle_runtime.json",
      JSON.stringify(input, null, 2)
    );

    execSync(
      `snarkjs wtns calculate \
circuits/capability_bound_count_merkle_v2_js/capability_bound_count_merkle_v2.wasm \
input_merkle_runtime.json \
witness_merkle_runtime.wtns`,
      { stdio: "inherit" }
    );

    execSync(
      `snarkjs groth16 prove \
capability_bound_count_merkle_v2.zkey \
witness_merkle_runtime.wtns \
proof_merkle_runtime.json \
public_merkle_runtime.json`,
      { stdio: "inherit" }
    );

    res.json({
      proof: JSON.parse(fs.readFileSync("proof_merkle_runtime.json")),
      publicSignals: JSON.parse(fs.readFileSync("public_merkle_runtime.json"))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
