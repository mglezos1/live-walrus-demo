// utils/commitment.mjs
// Computes Poseidon(patientId, testNonce, result) exactly like Circom Poseidon(3)

import { buildPoseidon } from "circomlibjs";

// Main function used by proveController
export async function computeCommitment(patientId, testNonce, result) {
  const poseidon = await buildPoseidon();

  // Convert everything to BigInt (Circom signals are field elements)
  const pid = BigInt(patientId);
  const nonce = BigInt(testNonce);
  const res = BigInt(result);

  // Poseidon(3) just like circuit
  const hash = poseidon([pid, nonce, res]);

  // Convert field element -> decimal string
  return poseidon.F.toString(hash);
}

// CLI usage:
// node utils/commitment.mjs 12345 9876543 1
if (process.argv.length === 5) {
  const [_, __, patientId, testNonce, result] = process.argv;
  computeCommitment(patientId, testNonce, result).then((h) => {
    console.log(h);
  });
}
