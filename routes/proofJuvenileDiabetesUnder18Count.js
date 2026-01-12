import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ZK helpers (ESM named exports)
import { generateWitness, generateProof } from "../utils/zk_fixed.mjs";

// Walrus helper (ESM named export)
import { fetchAndDecryptBlob } from "./utils/walrusDecrypt.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /proof/juvenile-diabetes/under18/count
router.post("/", async (req, res) => {
  try {
    const { blobId } = req.body;

    if (!blobId) {
      return res.status(400).json({ error: "Missing blobId" });
    }

    // 1. Fetch dataset from Walrus
    const binPath = fetchAndDecryptBlob({ blobId });

    // 2. Read + parse JSON
    const raw = await fs.readFile(binPath, "utf-8");
    const dataset = JSON.parse(raw);

    // 3. Extract ZK inputs
    const ages = dataset.map(p => p.age);

const diabeticLabels = new Set([
  "diabetes",
  "juvenile_diabetes",
  "type1_diabetes",
  "t1d"
]);

const conditions = dataset.map(p =>
  diabeticLabels.has(p.condition?.toLowerCase()) ? 1 : 0
);


    const input = { ages, conditions };

    // 4. Write input + witness paths
    const tmpDir = path.join(__dirname, "../tmp");
    const inputPath = path.join(tmpDir, "juvenile_input.json");
    const witnessPath = path.join(tmpDir, "juvenile_witness.wtns");

    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(inputPath, JSON.stringify(input));

    // 5. Generate witness
    await generateWitness(
      "circuits/juvenile_diabetes_under_18_count_10_js/juvenile_diabetes_under_18_count_10.wasm",
      inputPath,
      witnessPath
    );

    // 6. Generate proof
    const proofResult = await generateProof(
      "circuits/juvenile_diabetes_under_18_count_10.zkey",
      witnessPath
    );

    res.json({
      count: Number(proofResult.publicSignals[0]),
      total: dataset.length,
      proof: proofResult.proof,
      publicSignals: proofResult.publicSignals
    });

  } catch (err) {
    console.error("Juvenile diabetes ZK proof failed:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
