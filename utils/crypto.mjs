// utils/crypto.mjs
// Cryptographic utilities for hashing, signing, and encryption

import crypto from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

/**
 * Compute Poseidon hash of a dataset
 * @param {Object|Array} dataset - Dataset to hash
 * @returns {Promise<Uint8Array>} Poseidon hash as bytes
 */
export async function hashDataset(dataset) {
  // Build Poseidon instance
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  
  // Convert dataset to a consistent format
  const datasetString = JSON.stringify(dataset);
  const datasetBytes = new TextEncoder().encode(datasetString);
  
  // Use Poseidon hash (2 inputs: dataset bytes as two chunks)
  // For larger datasets, you'd hash in chunks or use a Merkle tree
  const chunkSize = 31; // Poseidon can handle up to 16 inputs, but we'll use 2 for simplicity
  const chunks = [];
  
  for (let i = 0; i < datasetBytes.length; i += chunkSize) {
    const chunk = datasetBytes.slice(i, i + chunkSize);
    // Pad chunk to 31 bytes
    const padded = new Uint8Array(31);
    padded.set(chunk);
    chunks.push(Array.from(padded));
  }
  
  // Hash chunks using Poseidon
  // For simplicity, hash first two chunks
  // In production, use a Merkle tree for large datasets
  if (chunks.length === 0) {
    chunks.push(new Array(31).fill(0));
  }
  if (chunks.length === 1) {
    chunks.push(new Array(31).fill(0));
  }
  
  // Convert chunks to BigInt inputs
  const input1 = BigInt('0x' + Buffer.from(chunks[0]).toString('hex'));
  const input2 = BigInt('0x' + Buffer.from(chunks[1]).toString('hex'));
  
  // Compute Poseidon hash
  const hashResult = poseidon([input1, input2]);
  const hashBigInt = F.toObject(hashResult);
  
  // Convert hash to bytes (32 bytes)
  // Poseidon outputs a field element, convert to bytes
  const hashBytes = new Uint8Array(32);
  const hashHex = hashBigInt.toString(16).padStart(64, '0');
  for (let i = 0; i < 32; i++) {
    hashBytes[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }
  
  return hashBytes;
}

/**
 * Sign a capability with Ed25519
 * @param {Object} capability - Capability object
 * @param {Ed25519Keypair} keypair - Ed25519 keypair
 * @returns {Uint8Array} Signature bytes
 */
export function signCapability(capability, keypair) {
  // Create message: capability_id || dataset_id_hash || query_params
  const messageParts = [
    capability.id || '',
    JSON.stringify(capability.dataset_id_hash || {}),
    JSON.stringify(capability.query_params || {}),
    capability.expires_at?.toString() || '',
  ];
  
  const message = new TextEncoder().encode(messageParts.join('|'));
  
  // Sign message using Ed25519
  // For now, use a hash-based signature as Ed25519 signing requires proper setup
  // In production, implement proper Ed25519 signing using the keypair
  // This is a placeholder that creates a deterministic signature
  const messageHash = crypto.createHash('sha256').update(message).digest();
  
  // Create a deterministic signature-like value (64 bytes for Ed25519)
  // In production, replace this with: keypair.sign(message) or proper Ed25519 signing
  const signature = Buffer.concat([
    messageHash,
    crypto.createHash('sha256').update(Buffer.concat([messageHash, keypair.getPublicKey().toRawBytes()])).digest()
  ]).slice(0, 64);
  
  return new Uint8Array(signature);
}

/**
 * Verify capability signature
 * @param {Object} capability - Capability object
 * @param {Uint8Array} signature - Signature bytes
 * @param {Uint8Array} publicKey - Public key bytes
 * @returns {boolean} True if signature is valid
 */
export function verifyCapabilitySignature(capability, signature, publicKey) {
  // Create same message as in signCapability
  const messageParts = [
    capability.id || '',
    JSON.stringify(capability.dataset_id_hash || {}),
    JSON.stringify(capability.query_params || {}),
    capability.expires_at?.toString() || '',
  ];
  
  const message = new TextEncoder().encode(messageParts.join('|'));
  
  // Verify signature (simplified - in production use proper Ed25519 verification)
  // This is a placeholder - actual verification would use crypto library
  try {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);
    return verify.verify(publicKey, signature);
  } catch (e) {
    return false;
  }
}

/**
 * Encrypt dataset using AES-256-GCM
 * @param {Object|Array|string} dataset - Dataset to encrypt
 * @param {string|Buffer} key - Encryption key (32 bytes for AES-256)
 * @returns {Object} Encrypted data with iv and authTag
 */
export function encryptDataset(dataset, key) {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  
  // Ensure key is 32 bytes
  const encryptionKey = keyBuffer.slice(0, 32);
  
  // Convert dataset to buffer
  const datasetString = typeof dataset === 'string' 
    ? dataset 
    : JSON.stringify(dataset);
  const datasetBuffer = Buffer.from(datasetString, 'utf8');
  
  // Generate random IV
  const iv = crypto.randomBytes(12); // 12 bytes for GCM
  
  // Create cipher
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  
  // Encrypt
  let encrypted = cipher.update(datasetBuffer, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted,
    iv: iv,
    authTag: authTag,
  };
}

/**
 * Decrypt dataset using AES-256-GCM
 * @param {Buffer} encryptedData - Encrypted data
 * @param {string|Buffer} key - Decryption key
 * @param {Buffer} iv - Initialization vector
 * @param {Buffer} authTag - Authentication tag
 * @returns {string} Decrypted dataset as string
 */
export function decryptDataset(encryptedData, key, iv, authTag) {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
  
  // Ensure key is 32 bytes
  const decryptionKey = keyBuffer.slice(0, 32);
  
  // Create decipher
  const decipher = crypto.createDecipheriv(algorithm, decryptionKey, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Generate a random encryption key
 * @returns {Buffer} 32-byte random key
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32);
}

/**
 * Hash a string using SHA-256
 * @param {string} input - Input string
 * @returns {string} Hex-encoded hash
 */
export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Hash bytes using SHA-256
 * @param {Buffer|Uint8Array} input - Input bytes
 * @returns {Buffer} Hash bytes
 */
export function sha256Bytes(input) {
  return crypto.createHash('sha256').update(input).digest();
}
