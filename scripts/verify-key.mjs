#!/usr/bin/env node
/**
 * Verify the private key in .env matches the expected address
 */
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf8');
const match = envFile.match(/^SUI_PRIVATE_KEY=(.+)$/m);

if (!match) {
  console.error('❌ SUI_PRIVATE_KEY not found in .env');
  process.exit(1);
}

const hexKey = match[1].trim();
const expectedAddress = '0x26b282894f3c083f05a4ceaafdd5578ac415a731265b760404ca2e2f64737438';

if (hexKey.length !== 64) {
  console.error(`❌ Invalid key length: ${hexKey.length} (expected 64)`);
  process.exit(1);
}

try {
  const bytes = Uint8Array.from(
    hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
  const keypair = Ed25519Keypair.fromSecretKey(bytes);
  const address = keypair.toSuiAddress();
  
  if (address === expectedAddress) {
    console.log('✅ Private key verified!');
    console.log(`   Address: ${address}`);
    console.log(`   Hex key: ${hexKey}`);
  } else {
    console.error('❌ Address mismatch!');
    console.error(`   Expected: ${expectedAddress}`);
    console.error(`   Got:      ${address}`);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error verifying key:', error.message);
  process.exit(1);
}
