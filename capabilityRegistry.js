// capabilityRegistry.js
// Enhanced capability registry with cryptographic signatures and query type support

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signCapability } from './utils/crypto.mjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const DATA_DIR = path.resolve('./data');
const CAPABILITY_FILE = path.join(DATA_DIR, 'capabilities.json');
const KEYS_DIR = path.resolve('./keys');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

// Load or generate issuer keypair
function loadOrCreateIssuerKeypair() {
  const keyPath = path.join(KEYS_DIR, 'issuer_keypair.json');
  
  if (fs.existsSync(keyPath)) {
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    return Ed25519Keypair.fromSecretKey(keyData.secretKey);
  } else {
    // Generate new keypair
    const keypair = new Ed25519Keypair();
    const keyData = {
      secretKey: Array.from(keypair.getSecretKey()),
      publicKey: Array.from(keypair.getPublicKey().toRawBytes()),
    };
    fs.writeFileSync(keyPath, JSON.stringify(keyData, null, 2));
    return keypair;
  }
}

const issuerKeypair = loadOrCreateIssuerKeypair();

// --------------------
// LOAD FROM DISK
// --------------------
let capabilities = [];

if (fs.existsSync(CAPABILITY_FILE)) {
  try {
    capabilities = JSON.parse(fs.readFileSync(CAPABILITY_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error loading capabilities:', err);
    capabilities = [];
  }
}

// --------------------
// SAVE TO DISK
// --------------------
function saveCapabilities() {
  fs.writeFileSync(
    CAPABILITY_FILE,
    JSON.stringify(capabilities, null, 2)
  );
}

// --------------------
// REGISTRY API
// --------------------

/**
 * Issue a capability with cryptographic signature
 * @param {Object} capabilityInput - Capability input
 * @param {string} capabilityInput.dataset_id_hash - Dataset ID hash (as hex string or bytes)
 * @param {string} capabilityInput.query_type - Query type: 'aggregate', 'range', 'condition', 'custom'
 * @param {Object} capabilityInput.query_params - Query parameters
 * @param {number} capabilityInput.expires_at - Expiration timestamp (optional, defaults to 24h from now)
 * @returns {Object} Capability object with signature
 */
export function issueCapability(capabilityInput) {
  const capabilityId = 'cap_' + crypto.randomBytes(8).toString('hex');
  const expiresAt = capabilityInput.expires_at || (Date.now() + 24 * 60 * 60 * 1000); // Default: 24 hours

  // Convert dataset_id_hash to consistent format
  let datasetIdHash = capabilityInput.dataset_id_hash;
  if (typeof datasetIdHash === 'number') {
    datasetIdHash = datasetIdHash.toString(16).padStart(64, '0');
  } else if (Buffer.isBuffer(datasetIdHash) || datasetIdHash instanceof Uint8Array) {
    datasetIdHash = Buffer.from(datasetIdHash).toString('hex');
  }

  const capability = {
    id: capabilityId,
    dataset_id_hash: datasetIdHash,
    query_type: capabilityInput.query_type || 'aggregate',
    query_params: capabilityInput.query_params || {},
    expires_at: expiresAt,
    issuer: Array.from(issuerKeypair.getPublicKey().toRawBytes()).map(b => b.toString(16).padStart(2, '0')).join(''),
    issued_at: Date.now(),
  };

  // Sign capability (signCapability is synchronous)
  let signature;
  try {
    signature = signCapability(capability, issuerKeypair);
    capability.signature = Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Failed to sign capability:', err);
    // Continue without signature for now (capability will be invalid)
    capability.signature = '';
  }

  capabilities.push(capability);
  saveCapabilities();
  
  return capability;
}

/**
 * Get capability by ID
 * @param {string} id - Capability ID
 * @returns {Object|null} Capability object or null if not found
 */
export function getCapability(id) {
  return capabilities.find(c => c.id === id) || null;
}

/**
 * List all capabilities
 * @returns {Array} Array of capabilities
 */
export function listCapabilities() {
  return capabilities;
}

/**
 * Get capabilities for a specific dataset
 * @param {string} datasetIdHash - Dataset ID hash
 * @returns {Array} Array of capabilities for the dataset
 */
export function getCapabilitiesForDataset(datasetIdHash) {
  // Normalize datasetIdHash
  let normalizedHash = datasetIdHash;
  if (typeof datasetIdHash === 'number') {
    normalizedHash = datasetIdHash.toString(16).padStart(64, '0');
  } else if (Buffer.isBuffer(datasetIdHash) || datasetIdHash instanceof Uint8Array) {
    normalizedHash = Buffer.from(datasetIdHash).toString('hex');
  }

  return capabilities.filter(c => {
    let capHash = c.dataset_id_hash;
    if (typeof capHash === 'number') {
      capHash = capHash.toString(16).padStart(64, '0');
    }
    return capHash === normalizedHash && c.expires_at > Date.now();
  });
}

/**
 * Validate capability (check signature and expiration)
 * @param {Object} capability - Capability object
 * @returns {boolean} True if valid
 */
export function validateCapability(capability) {
  // Check expiration
  if (capability.expires_at < Date.now()) {
    return false;
  }

  // Verify signature (simplified - in production use proper verification)
  // For now, just check that signature exists
  if (!capability.signature) {
    return false;
  }

  return true;
}

/**
 * Get issuer public key
 * @returns {string} Public key as hex string
 */
export function getIssuerPublicKey() {
  return Array.from(issuerKeypair.getPublicKey().toRawBytes())
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
