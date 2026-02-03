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
  // Sui expects Arkworks serialize_compressed format: 256 bytes total
  // For BN254, compressed format is still 256 bytes (A:64, B:128, C:64)
  
  // Helper to convert BigInt string to 32-byte big-endian Uint8Array
  function bigIntToBytes32BE(bigIntStr) {
    const value = BigInt(bigIntStr);
    const bytes = new Uint8Array(32);
    let temp = value;
    // Convert to big-endian (most significant byte first)
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(temp & 0xffn);
      temp = temp >> 8n;
    }
    return bytes;
  }

  // A is [x, y] in G1 compressed format (each 32 bytes big-endian, total 64 bytes)
  // pi_a format: [x, y, z] where z is usually "1" (affine coordinates)
  // For compressed format, we still serialize x and y as 32 bytes each
  const aX = bigIntToBytes32BE(pi_a[0]);
  const aY = bigIntToBytes32BE(pi_a[1]);
  
  // B is [[x1, x2], [y1, y2]] in G2 compressed format (each 32 bytes big-endian, total 128 bytes)
  // pi_b format: [[x1, x2], [y1, y2], [z1, z2]] where z is usually ["1", "0"]
  // For compressed format, we serialize x1, x2, y1, y2 as 32 bytes each
  const bX1 = bigIntToBytes32BE(pi_b[0][0]);
  const bX2 = bigIntToBytes32BE(pi_b[0][1]);
  const bY1 = bigIntToBytes32BE(pi_b[1][0]);
  const bY2 = bigIntToBytes32BE(pi_b[1][1]);
  
  // C is [x, y] in G1 compressed format (each 32 bytes big-endian, total 64 bytes)
  // pi_c format: [x, y, z] where z is usually "1" (affine coordinates)
  const cX = bigIntToBytes32BE(pi_c[0]);
  const cY = bigIntToBytes32BE(pi_c[1]);

  // Combine all proof points: A (64) + B (128) + C (64) = 256 bytes total
  // This matches Arkworks serialize_compressed format for BN254 Groth16 proofs
  const proofPointsBytes = new Uint8Array([
    ...aX, ...aY,           // A: 64 bytes
    ...bX1, ...bX2, ...bY1, ...bY2,  // B: 128 bytes (x1, x2, y1, y2)
    ...cX, ...cY,           // C: 64 bytes
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
  
  // Convert blob ID string to bytes (vector<u8>) as expected by Move contract
  const blobIdBytes = new TextEncoder().encode(blobId);
  
  // Serialize vector<u8> using BCS
  const blobIdSerialized = bcs.vector(bcs.u8()).serialize(Array.from(blobIdBytes));
  const hashSerialized = bcs.vector(bcs.u8()).serialize(Array.from(datasetHash));
  
  txb.moveCall({
    target: `${packageId}::DatasetRegistry::register_dataset`,
    arguments: [
      txb.object(registryObjectId), // Registry shared object
      txb.pure(blobIdSerialized), // blob_id as vector<u8>
      txb.pure(hashSerialized), // dataset_hash as vector<u8>
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
 * Submit proof to Sui for verification with verification key bytes
 * This version prepares the verifying key on-the-fly to avoid registration issues
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - ProofVerifier package ID
 * @param {string} registryObjectId - Registry shared object ID
 * @param {string} proofId - Unique proof ID
 * @param {string} blobId - Blob ID
 * @param {Uint8Array} publicOutput - Public output bytes
 * @param {Object} proof - Proof object from snarkjs
 * @param {Array} publicSignals - Public signals
 * @param {string} circuitId - Circuit identifier
 * @param {Uint8Array} verifyingKeyBytes - Verification key bytes
 * @param {Ed25519Keypair} signer - Signer keypair
 * @returns {Promise<Object>} Transaction result
 */
export async function submitProofWithKey(
  client,
  packageId,
  registryObjectId,
  proofId,
  blobId,
  publicOutput,
  proofFormatted, // Already formatted proof with proof_points_bytes
  publicSignals,
  circuitId,
  verifyingKeyBytes,
  signer
) {
  const publicInputsBytes = preparePublicInputsForSui(publicSignals);
  
  const txb = new TransactionBlock();
  
  // Get Clock object (always at 0x6 on Sui)
  const clock = txb.object('0x6');
  
  // Serialize vector<u8> arguments using BCS
  const publicOutputSerialized = bcs.vector(bcs.u8()).serialize(Array.from(publicOutput));
  const proofPointsSerialized = bcs.vector(bcs.u8()).serialize(proofFormatted.proof_points_bytes);
  const publicInputsSerialized = bcs.vector(bcs.u8()).serialize(Array.from(publicInputsBytes));
  const verifyingKeySerialized = bcs.vector(bcs.u8()).serialize(Array.from(verifyingKeyBytes));
  
  txb.moveCall({
    target: `${packageId}::ProofVerifier::verify_proof_with_key`,
    arguments: [
      txb.object(registryObjectId), // Registry shared object
      txb.pure.string(proofId),
      txb.pure.string(blobId),
      txb.pure(publicOutputSerialized), // public_output as vector<u8>
      txb.pure(proofPointsSerialized), // proof_points_bytes as vector<u8>
      txb.pure(publicInputsSerialized), // public_inputs as vector<u8>
      txb.pure.string(circuitId),
      txb.pure(verifyingKeySerialized), // verifying_key_bytes as vector<u8>
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
 * Submit proof to Sui for verification (original version with registered key)
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
  
  // Serialize vector<u8> arguments using BCS
  const publicOutputSerialized = bcs.vector(bcs.u8()).serialize(Array.from(publicOutput));
  const proofPointsSerialized = bcs.vector(bcs.u8()).serialize(proofFormatted.proof_points_bytes);
  const publicInputsSerialized = bcs.vector(bcs.u8()).serialize(Array.from(publicInputsBytes));
  
  txb.moveCall({
    target: `${packageId}::ProofVerifier::verify_proof`,
    arguments: [
      txb.object(registryObjectId), // Registry shared object
      txb.pure.string(proofId),
      txb.pure.string(blobId),
      txb.pure(publicOutputSerialized), // public_output as vector<u8>
      txb.pure(proofPointsSerialized), // proof_points_bytes as vector<u8>
      txb.pure(publicInputsSerialized), // public_inputs as vector<u8>
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
    
    // Convert proof ID string to bytes (vector<u8>) as expected by Move contract
    const proofIdBytes = new TextEncoder().encode(proofId);
    const proofIdSerialized = bcs.vector(bcs.u8()).serialize(Array.from(proofIdBytes));
    
    txb.moveCall({
      target: `${packageId}::ProofVerifier::get_proof_result`,
      arguments: [
        txb.object(registryObjectId),
        txb.pure(proofIdSerialized), // proof_id as vector<u8>
      ],
    });
    
    // Use devInspectTransactionBlock for read-only queries (better than dryRun)
    // This doesn't require gas and is designed for querying on-chain data
    const sender = '0x0000000000000000000000000000000000000000000000000000000000000000'; // Dummy sender for read-only
    const result = await client.devInspectTransactionBlock({
      sender,
      transactionBlock: txb,
    });
    
    // Parse the result from devInspectTransactionBlock
    // The result structure is: { results: [{ returnValues: [[bytes, type]] }] }
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult.returnValues && firstResult.returnValues.length > 0) {
        const returnValue = firstResult.returnValues[0];
        if (returnValue && returnValue[0] && returnValue[0].length > 0) {
          // The return value is BCS-encoded Option<ProofResult>
          // If bytes length > 0, it means Some(ProofResult), otherwise None
          // For now, return indication that proof exists
          // In production, you'd decode the BCS bytes to get the actual ProofResult struct
          return {
            proof_id: proofId,
            exists: true,
            blob_id: '', // Would need BCS decoding to get actual values
            public_output: '',
            verified_at: Date.now(),
            verifier_address: '',
            circuit_id: '',
          };
        }
      }
    }
    
    // Proof not found
    return {
      proof_id: proofId,
      exists: false,
    };
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
    
    // Convert blob ID string to bytes (vector<u8>) as expected by Move contract
    const blobIdBytes = new TextEncoder().encode(blobId);
    
    // Serialize vector<u8> using BCS
    const blobIdSerialized = bcs.vector(bcs.u8()).serialize(Array.from(blobIdBytes));
    
    txb.moveCall({
      target: `${packageId}::DatasetRegistry::get_dataset_hash`,
      arguments: [
        txb.object(registryObjectId),
        txb.pure(blobIdSerialized), // blob_id as vector<u8>
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

/**
 * Query all proofs for a dataset by blob_id using events
 * @param {SuiClient} client - Sui client
 * @param {string} packageId - ProofVerifier package ID
 * @param {string} blobId - Blob ID to query
 * @returns {Promise<Array>} Array of proof information
 */
export async function queryProofsByBlobId(client, packageId, blobId) {
  try {
    const eventType = `${packageId}::ProofVerifier::ProofVerified`;
    
    console.log(`[QUERY] Querying ProofVerified events for blob_id: ${blobId}`);
    console.log(`[QUERY] Expected event type: ${eventType}`);
    console.log(`[QUERY] Package ID: ${packageId}`);
    
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: packageId,
          module: 'ProofVerifier',
        },
      },
      limit: 100,
      order: 'descending',
    });

    console.log(`[QUERY] Total events returned: ${events.data?.length || 0}`);
    
    // Debug: log all event types
    if (events.data && events.data.length > 0) {
      const eventTypes = [...new Set(events.data.map(e => e.type))];
      console.log(`[QUERY] Unique event types found:`, eventTypes);
      
      // Log all ProofVerified events
      const proofEvents = events.data.filter(e => 
        e.type === eventType || e.type.includes('ProofVerified')
      );
      console.log(`[QUERY] ProofVerified events found: ${proofEvents.length}`);
      
      if (proofEvents.length > 0) {
        console.log(`[QUERY] Sample ProofVerified events:`, proofEvents.slice(0, 3).map(e => ({
          type: e.type,
          blob_id: e.parsedJson?.blob_id,
          proof_id: e.parsedJson?.proof_id,
          full: e.parsedJson
        })));
      }
    } else {
      console.log(`[QUERY] No events found. This could mean:`);
      console.log(`  - Events haven't been indexed yet (wait a few seconds)`);
      console.log(`  - No proofs have been submitted yet`);
      console.log(`  - Event query is incorrect`);
    }

    const proofs = [];
    for (const event of events.data || []) {
      const isProofVerifiedEvent = event.type === eventType || 
                                   event.type.includes('ProofVerified');
      
      if (isProofVerifiedEvent && event.parsedJson) {
        const eventData = event.parsedJson;
        console.log(`[QUERY] Checking event - blob_id: "${eventData.blob_id}", looking for: "${blobId}"`);
        if (eventData.blob_id === blobId) {
          proofs.push({
            proof_id: eventData.proof_id,
            blob_id: eventData.blob_id,
            verifier_address: eventData.verifier_address,
            timestamp: eventData.timestamp,
            tx_digest: event.id?.txDigest || event.txDigest || '',
            event_id: event.id?.eventSeq || event.eventSeq || '',
          });
        }
      }
    }

    console.log(`[QUERY] Found ${proofs.length} proof(s) for blob_id: ${blobId}`);
    return proofs;
  } catch (err) {
    console.error('Error querying proofs by blob_id:', err);
    throw err;
  }
}

/**
 * Check transaction status and events directly
 * @param {SuiClient} client - Sui client
 * @param {string} transactionDigest - Transaction digest to check
 * @returns {Promise<Object>} Transaction details with events
 */
export async function checkTransactionStatus(client, transactionDigest) {
  try {
    const tx = await client.getTransactionBlock({
      digest: transactionDigest,
      options: {
        showEvents: true,
        showEffects: true,
      },
    });
    
    console.log(`[TX-CHECK] Transaction ${transactionDigest}:`);
    console.log(`[TX-CHECK] Status:`, tx.effects?.status);
    console.log(`[TX-CHECK] Events count:`, tx.events?.length || 0);
    
    if (tx.events && tx.events.length > 0) {
      console.log(`[TX-CHECK] Event types:`, tx.events.map(e => e.type));
      console.log(`[TX-CHECK] Event data:`, tx.events.map(e => ({
        type: e.type,
        parsedJson: e.parsedJson
      })));
    } else {
      console.log(`[TX-CHECK] ⚠️  No events found in transaction!`);
    }
    
    return tx;
  } catch (err) {
    console.error('Error checking transaction:', err);
    throw err;
  }
}

/**
 * Query all registered verifying keys from the registry
 * This queries VerifyingKeyRegistered events
 */
export async function queryRegisteredVerifyingKeys(client, packageId) {
  try {
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: packageId,
          module: 'ProofVerifier',
        },
      },
      limit: 100,
      order: 'descending',
    });
    
    const registeredKeys = new Set();
    for (const event of events.data || []) {
      if (event.type.includes('VerifyingKeyRegistered') && event.parsedJson) {
        registeredKeys.add(event.parsedJson.circuit_id);
      }
    }
    
    console.log(`[QUERY] Registered verifying keys:`, Array.from(registeredKeys));
    return Array.from(registeredKeys);
  } catch (err) {
    console.error('Error querying registered verifying keys:', err);
    throw err;
  }
}
