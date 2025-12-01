// controllers/proveFromWalrusController.js
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateWitness, generateProof } from "../utils/zk_fixed.mjs";
import { computeCommitment } from "../utils/commitment.mjs";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function proveFromWalrusController(req, res) {
  try {
    const { blobId } = req.body;
    if (!blobId) return res.status(400).json({ error: "Missing blobId" });

    const filePath = path.join(__dirname, "../downloads", `${blobId}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 1️⃣ Download blob from Walrus
    const readCmd = `walrus read ${blobId} --wallet ~/.sui/sui_config/client.yaml > ${filePath}`;
    await execAsync(readCmd);

    // 2️⃣ Parse JSON content
    const data = JSON.parse(await fs.readFile(filePath, "utf8"));
    const { patient, result } = data;

    // 3️⃣ Convert readable data → numeric inputs
    const patientId = patient === "Alice" ? 12345 : 67890;
    const testNonce = 9876543;
    const resultNum = result === "Positive" ? 1 : 0;

    // 4️⃣ Compute Poseidon commitment
    const field = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    const commitmentBig = await computeCommitment(patientId, testNonce, resultNum);
    const commitmentField = (BigInt(commitmentBig) % field).toString();

    // ✅ All Circom inputs must be strings to avoid float conversion
    const input = {
      patientId: patientId.toString(),
      testNonce: testNonce.toString(),
      result: resultNum.toString(),
      commitment: commitmentField,
      claimedResult: resultNum.toString()
    };

    const inputPath = path.join(__dirname, "../build/input_from_walrus.json");
    await fs.writeFile(inputPath, JSON.stringify(input, null, 2));

    // 5️⃣ Generate witness + proof
    const wasm = path.join(__dirname, "../build/covid_result_js/covid_result.wasm");
    const witness = path.join(__dirname, "../build/witness_from_walrus.wtns");
    const zkey = path.join(__dirname, "../build/covid_result_final.zkey");

    await generateWitness(wasm, inputPath, witness);
    const { proof, publicSignals } = await generateProof(zkey, witness);

    return res.json({
      message: "✅ ZK proof generated from Walrus data",
      blobId,
      proof,
      publicSignals
    });

  } catch (err) {
    console.error("proveFromWalrusController error:", err);
    return res.status(500).json({ error: err.message });
  }
}
