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
    wasm: 'circuits/aggregate_count_js/aggregate_count.wasm',
    witnessGen: 'circuits/aggregate_count_js/generate_witness.js',
    zkey: 'circuits/aggregate_count.zkey',
    mapInputs: (dataset, queryParams) => {
      const N = 10; // Circuit expects exactly 10 records
      
      // Helper function to get field value with case-insensitive matching
      const getFieldValue = (record, fieldName) => {
        // Try exact match first
        if (record[fieldName] !== undefined) {
          return record[fieldName];
        }
        
        // Try case-insensitive match
        const lowerFieldName = fieldName.toLowerCase();
        for (const key in record) {
          if (key.toLowerCase() === lowerFieldName) {
            return record[key];
          }
        }
        
        // Try common variations
        const variations = [
          fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase(),
          fieldName.toUpperCase(),
          fieldName.toLowerCase()
        ];
        
        for (const variant of variations) {
          if (record[variant] !== undefined) {
            return record[variant];
          }
        }
        
        console.warn(`[PROOF-GEN] Field "${fieldName}" not found in record. Available fields:`, Object.keys(record));
        return undefined;
      };
      
      // Helper function to normalize value for comparison
      const normalizeValue = (val) => {
        if (val === null || val === undefined) return null;
        // Convert string numbers to actual numbers
        if (typeof val === 'string' && !isNaN(val) && val.trim() !== '') {
          const num = Number(val);
          if (!isNaN(num)) return num;
        }
        return val;
      };
      
      // Check if this is a multi-condition query
      if (Array.isArray(queryParams.conditions) && queryParams.conditions.length > 0) {
        const { conditions, logic_op } = queryParams;
        const logicOp = logic_op || 'AND';
        
        // Log query structure only (no sensitive data)
        console.log('[PROOF-GEN] Multi-condition query detected:', {
          conditionCount: conditions.length,
          logicOp,
          fields: conditions.map(c => c.field), // Only field names, not values
          datasetSize: dataset.length
        });
        
        // Map dataset to records (0 or 1 for match) based on multiple conditions
        const records = dataset.map((record, recordIndex) => {
          // Evaluate each condition for this record
          const conditionResults = conditions.map((cond, condIndex) => {
            const { field, operator, value } = cond;
            let fieldValue = getFieldValue(record, field);
            fieldValue = normalizeValue(fieldValue);
            const normalizedValue = normalizeValue(value);
            
            // Check if field value exists
            if (fieldValue === null || fieldValue === undefined) {
              // Only log field name, not value
              console.warn(`[PROOF-GEN] Record ${recordIndex}, Condition ${condIndex}: Field "${field}" is null/undefined`);
              return 0;
            }
            
            // Evaluate the condition
            let matches = false;
            if (operator === '>') matches = fieldValue > normalizedValue;
            else if (operator === '<') matches = fieldValue < normalizedValue;
            else if (operator === '>=') matches = fieldValue >= normalizedValue;
            else if (operator === '<=') matches = fieldValue <= normalizedValue;
            else if (operator === '==') {
              // For ==, handle both number and string comparison
              matches = fieldValue === normalizedValue || 
                       String(fieldValue) === String(normalizedValue) ||
                       Number(fieldValue) === Number(normalizedValue);
            }
            
            const result = matches ? 1 : 0;
            // Don't log field values - only match result
            return result;
          });
          
          // Combine conditions based on logic operator
          let finalMatch = false;
          if (logicOp === 'AND') {
            // All conditions must be true (all must be 1)
            finalMatch = conditionResults.every(result => result === 1);
          } else if (logicOp === 'OR') {
            // At least one condition must be true (at least one is 1)
            finalMatch = conditionResults.some(result => result === 1);
          }
          
          const finalResult = finalMatch ? 1 : 0;
          // Don't log patient records - privacy violation
          return finalResult;
        });
        
        // Pad or truncate to exactly N elements
        const paddedRecords = Array(N).fill(0);
        records.slice(0, N).forEach((val, i) => {
          paddedRecords[i] = val;
        });
        
        const matchCount = paddedRecords.reduce((sum, val) => sum + val, 0);
        console.log(`[PROOF-GEN] Total matches: ${matchCount} out of ${N} records`);
        
        return { records: paddedRecords };
      } else {
        // Single condition mode (backward compatibility)
        const { field, condition, value } = queryParams;
        
        // Log query structure only (no sensitive values)
        console.log('[PROOF-GEN] Single condition query:', { field, condition });
        console.log('[PROOF-GEN] Dataset size:', dataset.length);
        
        // Map dataset to records (0 or 1 for match)
        const records = dataset.map((record, recordIndex) => {
          let fieldValue = getFieldValue(record, field);
          fieldValue = normalizeValue(fieldValue);
          const normalizedValue = normalizeValue(value);
          
          if (fieldValue === null || fieldValue === undefined) {
            console.warn(`[PROOF-GEN] Record ${recordIndex}: Field "${field}" is null/undefined`);
            return 0;
          }
          
          let matches = false;
          if (condition === '>') matches = fieldValue > normalizedValue;
          else if (condition === '<') matches = fieldValue < normalizedValue;
          else if (condition === '>=') matches = fieldValue >= normalizedValue;
          else if (condition === '<=') matches = fieldValue <= normalizedValue;
          else if (condition === '==') {
            matches = fieldValue === normalizedValue || 
                     String(fieldValue) === String(normalizedValue) ||
                     Number(fieldValue) === Number(normalizedValue);
          }
          
          const result = matches ? 1 : 0;
          // Don't log field values - privacy violation
          return result;
        });
        
        // Pad or truncate to exactly N elements
        const paddedRecords = Array(N).fill(0);
        records.slice(0, N).forEach((val, i) => {
          paddedRecords[i] = val;
        });
        
        const matchCount = paddedRecords.reduce((sum, val) => sum + val, 0);
        console.log(`[PROOF-GEN] Total matches: ${matchCount} out of ${Math.min(dataset.length, N)} records`);
        
        return { records: paddedRecords };
      }
    },
  },
  sum_aggregate: {
    wasm: 'circuits/aggregate_sum_js/aggregate_sum.wasm',
    witnessGen: 'circuits/aggregate_sum_js/generate_witness.js',
    zkey: 'circuits/aggregate_sum.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field } = queryParams;
      const N = 10; // Circuit expects exactly 10 values
      
      const values = dataset.map(record => Number(record[field] || 0));
      
      // Pad or truncate to exactly N elements
      const paddedValues = Array(N).fill(0);
      values.slice(0, N).forEach((val, i) => {
        paddedValues[i] = val;
      });
      
      return { values: paddedValues };
    },
  },
  range_query: {
    wasm: 'circuits/range_count_js/range_count.wasm',
    witnessGen: 'circuits/range_count_js/generate_witness.js',
    zkey: 'circuits/range_count.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field, min_value, max_value } = queryParams;
      const N = 10; // Circuit expects exactly 10 values
      
      const values = dataset.map(record => Number(record[field] || 0));
      
      // Pad or truncate to exactly N elements
      const paddedValues = Array(N).fill(0);
      values.slice(0, N).forEach((val, i) => {
        paddedValues[i] = val;
      });
      
      return { values: paddedValues, min_value, max_value };
    },
  },
  condition_query: {
    wasm: 'circuits/condition_count_js/condition_count.wasm',
    witnessGen: 'circuits/condition_count_js/generate_witness.js',
    zkey: 'circuits/condition_count.zkey',
    mapInputs: (dataset, queryParams) => {
      const { field, operator, value } = queryParams;
      const N = 10; // Circuit expects exactly 10 values
      
      // Map operator string to circuit code: 0 = ==, 1 = >=, 2 = <=, 3 = >, 4 = <
      let operatorCode = 0;
      if (operator === '==') operatorCode = 0;
      else if (operator === '>=') operatorCode = 1;
      else if (operator === '<=') operatorCode = 2;
      else if (operator === '>') operatorCode = 3;
      else if (operator === '<') operatorCode = 4;
      
      // Extract field values from dataset
      const values = dataset.map(record => Number(record[field] || 0));
      
      // Pad or truncate to exactly N elements
      const paddedValues = Array(N).fill(0);
      values.slice(0, N).forEach((val, i) => {
        paddedValues[i] = val;
      });
      
      return { 
        values: paddedValues,
        operator: operatorCode,
        threshold: Number(value)
      };
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
      // Load metadata to get encryption key, IV, and authTag
      const uploadsDir = path.join(__dirname, '../uploads');
      const metadataPath = path.join(uploadsDir, `${blob_id}_metadata.json`);
      
      let metadata;
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent);
      } catch (err) {
        return res.status(404).json({
          error: `Failed to load dataset metadata: ${err.message}`
        });
      }

      // Read encrypted blob as binary
      const encryptedBuffer = await fs.readFile(datasetPath);
      
      // Extract encrypted data, authTag (16 bytes), and IV (12 bytes)
      // Format: encrypted + authTag + iv
      const authTagLength = 16;
      const ivLength = 12;
      const totalSuffixLength = authTagLength + ivLength;
      
      if (encryptedBuffer.length < totalSuffixLength) {
        return res.status(400).json({
          error: 'Invalid encrypted dataset format'
        });
      }
      
      const encryptedData = encryptedBuffer.slice(0, -totalSuffixLength);
      const authTag = encryptedBuffer.slice(-totalSuffixLength, -ivLength);
      const iv = encryptedBuffer.slice(-ivLength);
      
      // Decrypt dataset
      const encryptionKey = Buffer.from(metadata.encryptionKey, 'hex');
      const decryptedContent = decryptDataset(encryptedData, encryptionKey, iv, authTag);
      
      // Parse decrypted JSON
      dataset = JSON.parse(decryptedContent);
      
    } catch (err) {
      console.error('[PROOF-GEN] Decryption error:', err);
      return res.status(400).json({
        error: `Failed to decrypt dataset: ${err.message}`
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
    
    // Check if zkey file exists
    try {
      await fs.access(zkeyPath);
    } catch (err) {
      return res.status(500).json({
        error: `Zkey file not found: ${proofConfig.zkey}`,
        details: `The circuit proving key file is missing. You need to generate it using snarkjs.`,
        instructions: {
          step1: 'Compile the circuit (if not already done):',
          step1_cmd: `cd circuits && circom ${proofConfig.zkey.replace('circuits/', '').replace('.zkey', '.circom')} --r1cs --wasm --sym`,
          step2: 'Generate powers of tau (one-time, if not already done):',
          step2_cmd: 'cd circuits && snarkjs powersoftau new bn128 12 pot12_0000.ptau -v',
          step3: 'Contribute to powers of tau:',
          step3_cmd: 'cd circuits && snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="Test" -v',
          step4: 'Prepare phase 2:',
          step4_cmd: 'cd circuits && snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v',
          step5: 'Generate zkey file:',
          step5_cmd: `cd circuits && snarkjs groth16 setup ${proofConfig.zkey.replace('circuits/', '').replace('.zkey', '.r1cs')} pot12_final.ptau ${proofConfig.zkey.replace('circuits/', '').replace('.zkey', '_0000.zkey')}`,
          step6: 'Contribute to zkey:',
          step6_cmd: `cd circuits && snarkjs zkey contribute ${proofConfig.zkey.replace('circuits/', '').replace('.zkey', '_0000.zkey')} ${proofConfig.zkey.replace('circuits/', '')} --name="Test" -v`,
          note: 'See DEPLOYMENT.md or NEXT_STEPS.md for more details'
        }
      });
    }
    
    let proof, publicSignals;
    
    try {
      const result = await generateProof(zkeyPath, witnessPath);
      proof = result.proof;
      publicSignals = result.publicSignals;
    } catch (err) {
      return res.status(500).json({
        error: `Proof generation failed: ${err.message}`,
        details: err.message
      });
    }

    // Generate proof ID
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Return proof result (matching frontend type)
    const response = {
      success: true,
      proof_id: proofId,
      blob_id,
      proof: {
        pi_a: proof.pi_a,
        pi_b: proof.pi_b,
        pi_c: proof.pi_c,
      },
      public_signals: publicSignals,
      public_output: publicSignals[0]?.toString() || publicSignals[0], // First public signal is usually the result
      count: publicSignals[0]?.toString() || publicSignals[0], // For compatibility
    };
    
    console.log('[PROOF-GEN] ✅ Proof generated successfully:', {
      proof_id: proofId,
      blob_id,
      public_output: response.public_output,
    });
    
    res.json(response);

  } catch (err) {
    console.error('Generate proof error:', err);
    res.status(500).json({
      error: 'Proof generation failed',
      details: err.message
    });
  }
}
