// utils/sui.mjs
// Sui blockchain interaction utilities

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { bcs } from '@mysten/sui.js/bcs';

/**
 * Initialize Sui client
 * @param {string} network - Network name: 'devnet', 'testnet', 'mainnet', or custom RPC URL
 * @returns {SuiClient}
 */
export function getSuiClient(network = 'devnet') {
  const rpcUrl = network.startsWith('http') 
    ? network 
    : getFullnodeUrl(network);
  
  return new SuiClient({ url: rpcUrl });
}

/**
 * Call a Move function on Sui
 * @param {SuiClient} client - Sui client instance
 * @param {string} packageId - Package ID of the Move module
 * @param {string} module - Module name
 * @param {string} function - Function name
 * @param {Array} args - Function arguments
 * @param {Ed25519Keypair} signer - Keypair to sign the transaction
 * @param {number} gasBudget - Gas budget (default: 100000000)
 * @returns {Promise<Object>} Transaction result
 */
export async function callMoveFunction(
  client,
  packageId,
  module,
  functionName,
  args,
  signer,
  gasBudget = 100000000
) {
  const txb = new TransactionBlock();
  
  txb.moveCall({
    target: `${packageId}::${module}::${functionName}`,
    arguments: args.map(arg => {
      if (typeof arg === 'string') {
        return txb.pure.string(arg);
      } else if (typeof arg === 'number') {
        return txb.pure.u64(arg);
      } else if (arg instanceof Uint8Array || Buffer.isBuffer(arg)) {
        return txb.pure.vector('u8', Array.from(arg));
      } else {
        return txb.pure(arg);
      }
    }),
  });

  txb.setGasBudget(gasBudget);

  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  return result;
}

/**
 * Convert snarkjs proof JSON to Sui format (bytes)
 * @param {Object} proofJson - Proof object from snarkjs { pi_a, pi_b, pi_c }
 * @returns {Object} Formatted proof with proof_points_bytes
 */
export function prepareProofForSui(proofJson) {
  const { pi_a, pi_b, pi_c } = proofJson;

  // Convert proof points to bytes format expected by Sui
  // Format: [A (G1), B (G2), C (G1)]
  // Each point is serialized as bytes
  
  // A is [x, y] in G1 (each 32 bytes)
  const aBytes = new Uint8Array(64);
  // B is [[x1, x2], [y1, y2]] in G2 (each 32 bytes, total 128 bytes)
  const bBytes = new Uint8Array(128);
  // C is [x, y] in G1 (each 32 bytes)
  const cBytes = new Uint8Array(64);

  // Note: This is a simplified conversion
  // In production, you'd need to properly serialize the points according to
  // the curve format (BN254 for Circom)
  // For now, we'll assume the proof JSON contains the serialized bytes
  
  // If proof points are already in hex format, convert them
  function hexToBytes(hex) {
    if (typeof hex === 'string') {
      const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
      return new Uint8Array(
        cleanHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
    }
    return hex;
  }

  // Combine all proof points into a single byte array
  const proofPointsBytes = new Uint8Array([
    ...hexToBytes(pi_a[0]),
    ...hexToBytes(pi_a[1]),
    ...hexToBytes(pi_b[0][0]),
    ...hexToBytes(pi_b[0][1]),
    ...hexToBytes(pi_b[1][0]),
    ...hexToBytes(pi_b[1][1]),
    ...hexToBytes(pi_c[0]),
    ...hexToBytes(pi_c[1]),
  ]);

  return {
    proof_points_bytes: Array.from(proofPointsBytes),
  };
}

/**
 * Convert public signals to Sui format (bytes)
 * @param {Array<number|string>} publicSignals - Public signals from snarkjs
 * @returns {Uint8Array} Formatted public inputs as bytes (little-endian, 32 bytes each)
 */
export function preparePublicInputsForSui(publicSignals) {
  // Each public input should be 32 bytes (little-endian)
  const bytes = [];
  
  for (const signal of publicSignals) {
    // Convert to BigInt if string
    const value = typeof signal === 'string' ? BigInt(signal) : BigInt(signal);
    
    // Convert to little-endian bytes (32 bytes)
    const signalBytes = new Uint8Array(32);
    let temp = value;
    for (let i = 0; i < 32; i++) {
      signalBytes[i] = Number(temp & 0xffn);
      temp = temp >> 8n;
    }
    
    bytes.push(...Array.from(signalBytes));
  }
  
  return new Uint8Array(bytes);
}

/**
 * Prepare verifying key for Sui
 * @param {Object} vkeyJson - Verification key JSON from snarkjs
 * @returns {Uint8Array} Verifying key bytes in Arkworks format
 */
export function prepareVerifyingKeyForSui(vkeyJson) {
  // The verifying key needs to be in Arkworks canonical compressed format
  // This is a simplified version - in production, you'd need to properly
  // serialize the vkey according to Arkworks format
  
  // For now, return the vkey as-is if it's already bytes
  // Otherwise, convert from JSON structure
  if (vkeyJson instanceof Uint8Array || Buffer.isBuffer(vkeyJson)) {
    return vkeyJson;
  }
  
  // If vkey is in JSON format, you'd need to serialize it properly
  // This is a placeholder - actual implementation depends on vkey format
  return new Uint8Array(JSON.stringify(vkeyJson));
}

/**
 * Register dataset on-chain
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - DatasetRegistry package ID
 * @param {string} registryObjectId - Registry shared object ID
 * @param {string} blobId - Blob ID from Walrus
 * @param {Uint8Array} datasetHash - Dataset hash (Poseidon hash)
 * @param {Ed25519Keypair} signer - Signer keypair
 * @returns {Promise<Object>} Transaction result
 */
export async function registerDatasetOnChain(
  client,
  packageId,
  registryObjectId,
  blobId,
  datasetHash,
  signer
) {
  const txb = new TransactionBlock();
  
  // Get Clock object (always at 0x6 on Sui)
  const clock = txb.object('0x6');
  
  txb.moveCall({
    target: `${packageId}::DatasetRegistry::register_dataset`,
    arguments: [
      txb.object(registryObjectId), // Registry shared object
      txb.pure.string(blobId),
      txb.pure.vector('u8', Array.from(datasetHash)),
      clock, // Clock object
    ],
  });
  
  txb.setGasBudget(100000000);
  
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  
  return result;
}

/**
 * Submit proof to Sui for verification
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - ProofVerifier package ID
 * @param {string} proofId - Unique proof ID
 * @param {string} blobId - Blob ID
 * @param {Uint8Array} publicOutput - Public output bytes
 * @param {Object} proof - Proof object from snarkjs
 * @param {Array} publicSignals - Public signals
 * @param {string} circuitId - Circuit identifier
 * @param {Ed25519Keypair} signer - Signer keypair
 * @returns {Promise<Object>} Transaction result
 */
/**
 * Submit proof to Sui for verification
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - ProofVerifier package ID
 * @param {string} registryObjectId - Registry shared object ID
 * @param {string} proofId - Unique proof ID
 * @param {string} blobId - Blob ID
 * @param {Uint8Array} publicOutput - Public output bytes
 * @param {Object} proof - Proof object from snarkjs
 * @param {Array} publicSignals - Public signals
 * @param {string} circuitId - Circuit identifier
 * @param {Ed25519Keypair} signer - Signer keypair
 * @returns {Promise<Object>} Transaction result
 */
export async function submitProof(
  client,
  packageId,
  registryObjectId,
  proofId,
  blobId,
  publicOutput,
  proof,
  publicSignals,
  circuitId,
  signer
) {
  const proofFormatted = prepareProofForSui(proof);
  const publicInputsBytes = preparePublicInputsForSui(publicSignals);
  
  const txb = new TransactionBlock();
  
  // Get Clock object (always at 0x6 on Sui)
  const clock = txb.object('0x6');
  
  txb.moveCall({
    target: `${packageId}::ProofVerifier::verify_proof`,
    arguments: [
      txb.object(registryObjectId), // Registry shared object
      txb.pure.string(proofId),
      txb.pure.string(blobId),
      txb.pure.vector('u8', Array.from(publicOutput)),
      txb.pure.vector('u8', proofFormatted.proof_points_bytes),
      txb.pure.vector('u8', Array.from(publicInputsBytes)),
      txb.pure.string(circuitId),
      clock, // Clock object
    ],
  });
  
  txb.setGasBudget(100000000);
  
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  
  return result;
}

/**
 * Query proof result from blockchain
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - ProofVerifier package ID
 * @param {string} registryObjectId - Registry shared object ID
 * @param {string} proofId - Proof ID to query
 * @returns {Promise<Object|null>} Proof result or null if not found
 */
export async function queryProofResult(
  client,
  packageId,
  registryObjectId,
  proofId
) {
  try {
    const txb = new TransactionBlock();
    
    txb.moveCall({
      target: `${packageId}::ProofVerifier::get_proof_result`,
      arguments: [
        txb.object(registryObjectId),
        txb.pure.string(proofId),
      ],
    });
    
    // Use dry run to query without executing
    const result = await client.dryRunTransactionBlock({
      transactionBlock: txb,
    });
    
    // Parse the result from the dry run
    // The result will be in result.results[0].returnValues
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue && returnValue[0]) {
        // Decode the return value (it's a BCS-encoded Option<ProofResult>)
        // For now, return the raw bytes - in production you'd decode properly
        return {
          proof_id: proofId,
          exists: returnValue[0].length > 0,
          raw_data: returnValue[0],
        };
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error querying proof result:', err);
    throw err;
  }
}

/**
 * Query dataset record from blockchain
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - DatasetRegistry package ID
 * @param {string} registryObjectId - Registry shared object ID
 * @param {string} blobId - Blob ID to query
 * @returns {Promise<Object|null>} Dataset record or null if not found
 */
export async function queryDatasetRecord(
  client,
  packageId,
  registryObjectId,
  blobId
) {
  try {
    const txb = new TransactionBlock();
    
    txb.moveCall({
      target: `${packageId}::DatasetRegistry::get_dataset_hash`,
      arguments: [
        txb.object(registryObjectId),
        txb.pure.string(blobId),
      ],
    });
    
    const result = await client.dryRunTransactionBlock({
      transactionBlock: txb,
    });
    
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues[0];
      if (returnValue && returnValue[0] && returnValue[0].length > 0) {
        return {
          blob_id: blobId,
          dataset_hash: returnValue[0],
          exists: true,
        };
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error querying dataset record:', err);
    throw err;
  }
}
