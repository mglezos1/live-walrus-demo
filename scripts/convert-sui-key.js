#!/usr/bin/env node
/**
 * Convert Sui bech32 private key to hex format
 * Usage: node convert-sui-key.js <bech32_key>
 */

import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const bech32Key = process.argv[2];

if (!bech32Key) {
  console.error('Usage: node convert-sui-key.js <bech32_private_key>');
  console.error('Example: node convert-sui-key.js suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t');
  process.exit(1);
}

try {
  // Import keypair from bech32 format
  const keypair = Ed25519Keypair.fromSecretKey(
    Buffer.from(bech32Key.replace(/^suiprivkey1/, ''), 'base64')
  );
  
  // Get secret key bytes (32 bytes for Ed25519)
  const secretKey = keypair.getSecretKey();
  
  // Convert to hex
  const hexKey = Buffer.from(secretKey).toString('hex');
  
  if (hexKey.length === 64) {
    console.log(hexKey);
  } else {
    console.error(`Error: Expected 64-character hex key, got ${hexKey.length} characters`);
    process.exit(1);
  }
} catch (error) {
  console.error('Error converting key:', error.message);
  console.error('\nMake sure you have @mysten/sui.js installed:');
  console.error('  npm install @mysten/sui.js');
  process.exit(1);
}
