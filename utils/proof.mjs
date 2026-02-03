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
  
  // Try .js first (newer circom), then .cjs (older circom)
  let witnessGen = path.join(circuitDir, 'generate_witness.js');
  let exists = await fs.access(witnessGen).then(() => true).catch(() => false);
  
  if (!exists) {
    witnessGen = path.join(circuitDir, 'generate_witness.cjs');
    exists = await fs.access(witnessGen).then(() => true).catch(() => false);
  }
  
  if (!exists) {
    throw new Error(`Witness generator not found: ${path.join(circuitDir, 'generate_witness.js')} or ${path.join(circuitDir, 'generate_witness.cjs')}`);
  }

  // If it's a .js file, circom generates it with require() (CommonJS)
  // but our project uses ES modules. We need to copy both generate_witness.js
  // and witness_calculator.js to .cjs versions so they can use require()
  const isJS = witnessGen.endsWith('.js');
  
  if (isJS) {
    // Create .cjs copies of both files
    const cjsWitnessGen = witnessGen.replace('.js', '.cjs');
    const witnessCalcJs = path.join(circuitDir, 'witness_calculator.js');
    const witnessCalcCjs = path.join(circuitDir, 'witness_calculator.cjs');
    
    // Copy generate_witness.js to .cjs
    const witnessGenContent = await fs.readFile(witnessGen, 'utf8');
    // Update the require path to use .cjs version
    const updatedContent = witnessGenContent.replace(
      /require\(["']\.\/witness_calculator\.js["']\)/g,
      'require("./witness_calculator.cjs")'
    );
    await fs.writeFile(cjsWitnessGen, updatedContent);
    
    // Copy witness_calculator.js to .cjs if it exists
    try {
      const witnessCalcContent = await fs.readFile(witnessCalcJs, 'utf8');
      await fs.writeFile(witnessCalcCjs, witnessCalcContent);
    } catch (err) {
      // witness_calculator.js might not exist, that's okay
      console.warn(`[PROOF] witness_calculator.js not found, skipping copy: ${err.message}`);
    }
    
    // Run the .cjs version
    const cmd = `node ${cjsWitnessGen} ${circuitWasm} ${inputJson} ${witnessPath}`;
    await execAsync(cmd);
  } else {
    // Already .cjs, just run it
    const cmd = `node ${witnessGen} ${circuitWasm} ${inputJson} ${witnessPath}`;
    await execAsync(cmd);
  }
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
