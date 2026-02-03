#!/usr/bin/env node
/**
 * Convert Sui bech32 private key to hex format
 * This properly decodes bech32 first, then extracts the secret key
 */
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

// Try to import bech32, or use manual decoding
let bech32Decode;
try {
  const bech32Module = await import('bech32');
  bech32Decode = bech32Module.bech32.decode;
} catch (e) {
  // Fallback: use base64 directly (Sui bech32 keys might just be base64 with prefix)
  bech32Decode = null;
}

const bech32Key = process.argv[2] || 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t';
const expectedAddress = '0x26b282894f3c083f05a4ceaafdd5578ac415a731265b760404ca2e2f64737438';

let rawBytes;

if (bech32Decode) {
  // Proper bech32 decoding
  try {
    const decoded = bech32Decode(bech32Key);
    // Convert from 5-bit words to bytes
    const converted = [];
    let bits = 0;
    let value = 0;
    for (const word of decoded.words) {
      value = (value << 5) | word;
      bits += 5;
      if (bits >= 8) {
        converted.push(value >> (bits - 8));
        bits -= 8;
        value &= (1 << bits) - 1;
      }
    }
    rawBytes = new Uint8Array(converted.slice(1)); // Skip version byte
  } catch (e) {
    console.error('Bech32 decode failed, trying base64:', e.message);
    rawBytes = null;
  }
}

if (!rawBytes) {
  // Fallback: treat as base64 after removing prefix
  const b64 = bech32Key.replace(/^suiprivkey1/, '');
  rawBytes = fromB64(b64);
}

console.log('Raw bytes length:', rawBytes.length);
console.log('First byte:', rawBytes[0]);

// Try different extraction methods
const methods = [
  { name: 'slice(1, 33) - skip first byte', bytes: rawBytes.slice(1, 33) },
  { name: 'slice(1) - skip first byte', bytes: rawBytes.slice(1) },
  { name: 'slice(0, 32) - first 32 bytes', bytes: rawBytes.slice(0, 32) },
  { name: 'slice(12, 44) - middle section', bytes: rawBytes.slice(12, 44) },
];

let found = false;
for (const method of methods) {
  if (method.bytes.length === 32) {
    try {
      const kp = Ed25519Keypair.fromSecretKey(method.bytes);
      const addr = kp.toSuiAddress();
      const hex = Buffer.from(method.bytes).toString('hex');
      
      if (addr === expectedAddress) {
        console.log(`\n✅ CORRECT KEY FOUND using: ${method.name}`);
        console.log('Hex key:', hex);
        console.log('Address:', addr);
        found = true;
        break;
      } else {
        console.log(`\n${method.name}:`);
        console.log('  Address:', addr, '(does not match)');
        console.log('  Hex:', hex);
      }
    } catch (e) {
      console.log(`\n${method.name}: Error - ${e.message}`);
    }
  }
}

if (!found) {
  console.error('\n❌ Could not find matching key. Trying to extract from wallet file...');
  console.error('You may need to extract the key directly from ~/.sui/sui_config/client.yaml');
  process.exit(1);
}
