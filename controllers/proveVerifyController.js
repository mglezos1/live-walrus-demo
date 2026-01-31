import fs from "fs";
import { execSync } from "child_process";

export default async function verifyProof(req, res) {
  try {
    const { proof, publicSignals } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({
        error: "proof and publicSignals are required"
      });
    }

    // Write temp files
    fs.writeFileSync(
      "verify_proof.json",
      JSON.stringify(proof, null, 2)
    );

    fs.writeFileSync(
      "verify_public.json",
      JSON.stringify(publicSignals, null, 2)
    );

    // 🔐 IMPORTANT: USE V2 VERIFICATION KEY
    execSync(
      `snarkjs groth16 verify \
       capability_bound_count_merkle_v2_vkey.json \
       verify_public.json \
       verify_proof.json`
    );

    res.json({ valid: true });
  } catch (err) {
    console.error(err.toString());
    res.json({ valid: false });
  }
}
