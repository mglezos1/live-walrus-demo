#!/usr/bin/env node
// Script to register verifying keys on Sui blockchain
// Usage: node scripts/register-verifying-keys.mjs <circuit_name> [package_id] [registry_object_id]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSuiClient } from '../utils/sui.mjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { bcs } from '@mysten/sui.js/bcs';
import dotenv from 'dotenv';
import { convertVkeyToSuiBytes } from '../utils/vkey-serializer.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function registerVerifyingKey(circuitName, packageId, registryObjectId) {
  const circuitsDir = path.join(__dirname, '../circuits');
  const vkeyPath = path.join(circuitsDir, `${circuitName}_vkey.json`);
  const zkeyPath = path.join(circuitsDir, `${circuitName}.zkey`);
  
  // Check if verifying key JSON exists, if not generate it
  if (!fs.existsSync(vkeyPath)) {
    if (!fs.existsSync(zkeyPath)) {
      throw new Error(`Neither ${vkeyPath} nor ${zkeyPath} found. Please generate the zkey file first.`);
    }
    
    console.log(`📦 Generating verification key from ${circuitName}.zkey...`);
    const { execSync } = await import('child_process');
    try {
      // Use npx to ensure snarkjs is available
      execSync(`npx snarkjs zkey export verificationkey ${zkeyPath} ${vkeyPath}`, {
        cwd: circuitsDir,
        stdio: 'inherit',
        env: { ...process.env, PATH: process.env.PATH }
      });
      console.log(`✅ Verification key generated: ${vkeyPath}`);
    } catch (err) {
      throw new Error(`Failed to generate verification key: ${err.message}`);
    }
  }
  
  // Read verification key JSON
  console.log(`📖 Reading verification key from ${vkeyPath}...`);
  const vkeyJson = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
  
  // Convert to Sui bytes format
  console.log(`🔄 Converting verification key to Sui format...`);
  const vkeyBytes = convertVkeyToSuiBytes(vkeyJson);
  
  // Get Sui client and signer
  const suiNetwork = process.env.SUI_NETWORK || 'testnet';
  const client = getSuiClient(suiNetwork);
  
  if (!process.env.SUI_PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY not set in .env file');
  }
  
  const privateKeyHex = process.env.SUI_PRIVATE_KEY.replace(/^0x/, '');
  if (privateKeyHex.length !== 64) {
    throw new Error('Invalid SUI_PRIVATE_KEY format (expected 64 hex characters)');
  }
  
  const privateKeyBytes = Uint8Array.from(
    privateKeyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
  const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  
  // Create transaction
  const txb = new TransactionBlock();
  
  // Serialize circuit_id and verifying_key_bytes
  // Use direct bytes instead of BCS serialization for large verifying keys
  const circuitIdBytes = new TextEncoder().encode(circuitName);
  
  // For verifying keys, pass as raw bytes array
  // The Move contract expects vector<u8>, so we pass the bytes directly
  txb.moveCall({
    target: `${packageId}::ProofVerifier::register_verifying_key`,
    arguments: [
      txb.object(registryObjectId),
      txb.pure(bcs.vector(bcs.u8()).serialize(Array.from(circuitIdBytes))),
      txb.pure(Array.from(vkeyBytes)), // Pass as raw bytes array, Sui SDK will serialize
    ],
  });
  
  txb.setGasBudget(100000000);
  
  console.log(`🚀 Registering verifying key for circuit: ${circuitName}`);
  console.log(`   Package ID: ${packageId}`);
  console.log(`   Registry Object ID: ${registryObjectId}`);
  
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: txb,
    signer: keypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  
  console.log(`✅ Verifying key registered successfully!`);
  console.log(`   Transaction Digest: ${result.digest}`);
  console.log(`   Circuit ID: ${circuitName}`);
  
  return result;
}

// Main
const circuitName = process.argv[2];
const packageId = process.argv[3] || process.env.PROOF_VERIFIER_PACKAGE_ID;
const registryObjectId = process.argv[4] || process.env.PROOF_VERIFIER_REGISTRY_OBJECT_ID;

if (!circuitName) {
  console.error('Usage: node scripts/register-verifying-keys.mjs <circuit_name> [package_id] [registry_object_id]');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/register-verifying-keys.mjs aggregate_count');
  console.error('  node scripts/register-verifying-keys.mjs aggregate_count 0x... 0x...');
  process.exit(1);
}

if (!packageId || !registryObjectId) {
  console.error('Error: PROOF_VERIFIER_PACKAGE_ID and PROOF_VERIFIER_REGISTRY_OBJECT_ID must be set in .env or provided as arguments');
  process.exit(1);
}

registerVerifyingKey(circuitName, packageId, registryObjectId)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
