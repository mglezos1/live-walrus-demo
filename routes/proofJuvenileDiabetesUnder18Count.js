// routes/proofJuvenileDiabetesUnder18Count.js
import express from "express";
import fs from "fs";

import { fetchAndDecryptBlob } from "./utils/walrusDecrypt.js";
import {
  generateWitness,
  generateProof
} from "../utils/zk_fixed.mjs";

const router = express.Router();
const CIRCUIT_SIZE = 10;

router.post("/", async (req, res) => {
  try {
    const { blobId } = req.body;
    if (!blobId) {
      return res.status(400).json({ error: "Missing blobId" });
    }

    // 1️⃣ Fetch JSON from Walrus
    const datasetPath = fetchAndDecryptBlob({ blobId });
    const raw = fs.readFileSync(datasetPath, "utf-8");
    const parsed = JSON.parse(raw);

    // 2️⃣ Normalize to array (single patient → dataset of 1)
    const dataset = Array.isArray(parsed) ? parsed : [parsed];

    // 3️⃣ Build fixed-size circuit inputs
    const ages = [];
    const conditions = [];

    for (let i = 0; i < CIRCUIT_SIZE; i++) {
      const record = dataset[i];

      if (record) {
        ages.push(Number(record.age || 0));

        const conditionStr = String(
          record.condition || record.diagnosis || ""
        ).toLowerCase();

        // juvenile diabetes flag (1 = yes, 0 = no)
        conditions.push(
          conditionStr.includes("diab") || conditionStr.includes("t1d")
            ? 1
            : 0
        );
      } else {
        // padding
        ages.push(0);
        conditions.push(0);
      }
    }

    // 4️⃣ EXACTLY match circuit inputs
    const input = { ages, conditions };
    fs.writeFileSync(
      "input_juvenile_diabetes.json",
      JSON.stringify(input, null, 2)
    );

    // 5️⃣ Generate witness
    await generateWitness(
      "circuits/juvenile_diabetes_under_18_count_10_js/juvenile_diabetes_under_18_count_10.wasm",
      "input_juvenile_diabetes.json",
      "witness_juvenile_diabetes.wtns"
    );

    // 6️⃣ Generate proof
    const { proof, publicSignals } = await generateProof(
      "circuits/juvenile_diabetes_under_18_count_10.zkey",
      "witness_juvenile_diabetes.wtns"
    );

    // 7️⃣ Respond
    res.json({
      count: Number(publicSignals[0]),
      total: dataset.length,
      proof,
      publicSignals
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Proof failed",
      details: err.message
    });
  }
});

export default router;
