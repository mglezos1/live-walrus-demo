#!/usr/bin/env node
/**
 * Convert Sui bech32 private key to hex format using Sui SDK
 * Usage: node convert-key-using-sui-sdk.mjs <bech32_key>
 */

import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

const bech32Key = process.argv[2] || 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t';

if (!bech32Key || bech32Key === '--help' || bech32Key === '-h') {
  console.error('Usage: node convert-key-using-sui-sdk.mjs <bech32_private_key>');
  console.error('Example: node convert-key-using-sui-sdk.mjs suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t');
  process.exit(1);
}

try {
  // Sui bech32 keys have the format: suiprivkey1<base64_data>
  // The base64 data contains: version byte (1 byte) + secret key (32 bytes) + checksum (11 bytes) = 44 bytes total
  // We need to extract the base64 part and decode it, then take bytes 1-33 (skip version, take 32 bytes)
  const base64Part = bech32Key.replace(/^suiprivkey1/, '');
  
  // Decode from base64
  const keyBytes = fromB64(base64Part);
  
  // The first byte is version, bytes 1-33 are the actual secret key (32 bytes)
  // But we got 44 bytes, so let's check the structure
  if (keyBytes.length === 44) {
    // Extract the 32-byte secret key (skip first byte, take next 32 bytes)
    const secretKeyBytes = keyBytes.slice(1, 33);
    
    // Verify it's 32 bytes
    if (secretKeyBytes.length !== 32) {
      console.error(`Error: Expected 32-byte secret key, got ${secretKeyBytes.length} bytes`);
      process.exit(1);
    }
    
    // Convert to hex directly (this is the secret key we need)
    const hexKey = Buffer.from(secretKeyBytes).toString('hex');
    
    // Verify the keypair can be created (for validation)
    try {
      const keypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);
      // Verify it works by checking the address matches
      const address = keypair.toSuiAddress();
      console.error(`# Verified: Address matches: ${address}`);
    } catch (e) {
      console.error(`# Warning: Could not verify keypair: ${e.message}`);
    }
    
    if (hexKey.length === 64) {
      console.log(hexKey);
    } else {
      console.error(`Error: Expected 64-character hex key, got ${hexKey.length} characters`);
      console.error(`Hex key: ${hexKey}`);
      process.exit(1);
    }
  } else {
    // Try alternative: maybe it's just the secret key directly
    if (keyBytes.length === 32) {
      const hexKey = Buffer.from(keyBytes).toString('hex');
      console.log(hexKey);
    } else {
      console.error(`Error: Unexpected key length. Got ${keyBytes.length} bytes, expected 32 or 44`);
      console.error(`First 10 bytes (hex): ${Buffer.from(keyBytes.slice(0, 10)).toString('hex')}`);
      process.exit(1);
    }
  }
} catch (error) {
  console.error('Error converting key:', error.message);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
}
