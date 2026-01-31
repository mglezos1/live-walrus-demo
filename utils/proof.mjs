// utils/proof.mjs
// Proof generation utilities

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Generate witness for a circuit
 * @param {string} circuitWasm - Path to circuit WASM file
 * @param {string} inputJson - Path to input JSON file
 * @param {string} witnessPath - Path to output witness file
 * @returns {Promise<void>}
 */
export async function generateWitness(circuitWasm, inputJson, witnessPath) {
  // Find witness generator script (usually in circuit_js directory)
  const circuitDir = path.dirname(circuitWasm);
  const witnessGen = path.join(circuitDir, 'generate_witness.cjs');
  
  if (!await fs.access(witnessGen).then(() => true).catch(() => false)) {
    throw new Error(`Witness generator not found: ${witnessGen}`);
  }

  const cmd = `node ${witnessGen} ${circuitWasm} ${inputJson} ${witnessPath}`;
  await execAsync(cmd);
}

/**
 * Generate Groth16 proof
 * @param {string} zkeyPath - Path to zkey file
 * @param {string} witnessPath - Path to witness file
 * @returns {Promise<{proof: Object, publicSignals: Array}>}
 */
export async function generateProof(zkeyPath, witnessPath) {
  const proofPath = witnessPath.replace('.wtns', '_proof.json');
  const publicPath = witnessPath.replace('.wtns', '_public.json');

  const cmd = `snarkjs groth16 prove ${zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`;
  await execAsync(cmd);

  const proof = JSON.parse(await fs.readFile(proofPath, 'utf8'));
  const publicSignals = JSON.parse(await fs.readFile(publicPath, 'utf8'));

  return { proof, publicSignals };
}

/**
 * Format proof for Sui Move contract
 * @param {Object} proofJson - Proof object from snarkjs
 * @returns {Object} Formatted proof
 */
export function formatProofForSui(proofJson) {
  // This is a simplified version
  // In production, you'd properly serialize the proof points
  return {
    pi_a: proofJson.pi_a,
    pi_b: proofJson.pi_b,
    pi_c: proofJson.pi_c,
  };
}

/**
 * Format public inputs for Sui
 * @param {Array} publicSignals - Public signals from snarkjs
 * @returns {Array<number>} Formatted public inputs
 */
export function formatPublicInputsForSui(publicSignals) {
  return publicSignals.map(signal => {
    if (typeof signal === 'string') {
      return BigInt(signal).toString();
    }
    return signal.toString();
  });
}
