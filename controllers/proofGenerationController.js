// controllers/proofGenerationController.js
// Unified proof generation service supporting multiple query types

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readBlob } from '../utils/walrus.mjs';
import { decryptDataset } from '../utils/crypto.mjs';
import { generateWitness, generateProof } from '../utils/proof.mjs';
import { getCapability, validateCapability } from '../capabilityRegistry.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Proof type registry - maps proof types to circuit configurations
 */
const PROOF_TYPES = {
  count_aggregate: {
    wasm: 'circuits/aggregate_count/aggregate_count.wasm',
    witnessGen: 'circuits/aggregate_count/generate_witness.cjs',
    zkey: 'circuits/aggregate_count.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field, condition, value } = queryParams;
      const records = dataset.map(record => {
        const fieldValue = record[field];
        const matches = condition === '>' ? fieldValue > value :
                       condition === '<' ? fieldValue < value :
                       condition === '>=' ? fieldValue >= value :
                       condition === '<=' ? fieldValue <= value :
                       condition === '==' ? fieldValue === value : false;
        return matches ? 1 : 0;
      });
      return { records };
    },
  },
  sum_aggregate: {
    wasm: 'circuits/aggregate_sum/aggregate_sum.wasm',
    witnessGen: 'circuits/aggregate_sum/generate_witness.cjs',
    zkey: 'circuits/aggregate_sum.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field } = queryParams;
      const values = dataset.map(record => Number(record[field] || 0));
      return { values };
    },
  },
  range_query: {
    wasm: 'circuits/range_count/range_count.wasm',
    witnessGen: 'circuits/range_count/generate_witness.cjs',
    zkey: 'circuits/range_count.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field, min_value, max_value } = queryParams;
      const values = dataset.map(record => Number(record[field] || 0));
      return { values, min_value, max_value };
    },
  },
  condition_query: {
    wasm: 'circuits/condition_count/condition_count.wasm',
    witnessGen: 'circuits/condition_count/generate_witness.cjs',
    zkey: 'circuits/condition_count.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field, operator, value } = queryParams;
      const records = dataset.map(record => {
        const fieldValue = Number(record[field] || 0);
        const matches = operator === '>' ? fieldValue > value :
                       operator === '<' ? fieldValue < value :
                       operator === '>=' ? fieldValue >= value :
                       operator === '<=' ? fieldValue <= value :
                       operator === '==' ? fieldValue === value : false;
        return matches ? 1 : 0;
      });
      return { records };
    },
  },
};

/**
 * Generate ZK proof
 * POST /proofs/generate
 * Body: {
 *   blob_id: string,
 *   capability_id: string,
 *   proof_type: string
 * }
 */
export async function generateProofController(req, res) {
  try {
    const { blob_id, capability_id, proof_type } = req.body;

    if (!blob_id || !capability_id || !proof_type) {
      return res.status(400).json({
        error: 'blob_id, capability_id, and proof_type are required'
      });
    }

    // Get and validate capability
    const capability = getCapability(capability_id);
    if (!capability) {
      return res.status(404).json({
        error: 'Capability not found'
      });
    }

    if (!validateCapability(capability)) {
      return res.status(400).json({
        error: 'Capability is expired or invalid'
      });
    }

    // Check proof type matches capability query type
    const proofConfig = PROOF_TYPES[proof_type];
    if (!proofConfig) {
      return res.status(400).json({
        error: `Unsupported proof_type: ${proof_type}`
      });
    }

    // Download dataset from Walrus
    const downloadsDir = path.join(__dirname, '../downloads');
    await fs.mkdir(downloadsDir, { recursive: true });

    const datasetPath = path.join(downloadsDir, `${blob_id}.json`);
    const walletPath = process.env.SUI_WALLET_PATH || '~/.sui/sui_config/client.yaml';
    
    try {
      await readBlob(blob_id, datasetPath, walletPath);
    } catch (err) {
      return res.status(404).json({
        error: `Failed to download dataset: ${err.message}`
      });
    }

    // Load and decrypt dataset
    let dataset;
    try {
      const datasetContent = await fs.readFile(datasetPath, 'utf8');
      dataset = JSON.parse(datasetContent);
      
      // If dataset is encrypted, decrypt it
      // In production, you'd check metadata and decrypt accordingly
      // For now, assume it's plain JSON
    } catch (err) {
      return res.status(400).json({
        error: `Failed to parse dataset: ${err.message}`
      });
    }

    // Map dataset to circuit inputs based on capability
    const input = proofConfig.mapInputs(dataset, capability.query_params);
    const inputPath = path.join(downloadsDir, `input_${blob_id}.json`);
    await fs.writeFile(inputPath, JSON.stringify(input, null, 2));

    // Generate witness
    const witnessPath = path.join(downloadsDir, `witness_${blob_id}.wtns`);
    const wasmPath = path.resolve(__dirname, '..', proofConfig.wasm);
    
    try {
      await generateWitness(wasmPath, inputPath, witnessPath);
    } catch (err) {
      return res.status(500).json({
        error: `Witness generation failed: ${err.message}`
      });
    }

    // Generate proof
    const zkeyPath = path.resolve(__dirname, '..', proofConfig.zkey);
    let proof, publicSignals;
    
    try {
      const result = await generateProof(zkeyPath, witnessPath);
      proof = result.proof;
      publicSignals = result.publicSignals;
    } catch (err) {
      return res.status(500).json({
        error: `Proof generation failed: ${err.message}`
      });
    }

    // Generate proof ID
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Return proof result
    res.json({
      success: true,
      proof_id: proofId,
      blob_id,
      capability_id,
      proof_type,
      proof,
      public_signals: publicSignals,
      public_output: publicSignals[0], // First public signal is usually the result
    });

  } catch (err) {
    console.error('Generate proof error:', err);
    res.status(500).json({
      error: 'Proof generation failed',
      details: err.message
    });
  }
}
