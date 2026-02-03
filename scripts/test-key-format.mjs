#!/usr/bin/env node
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

const key = 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t';
const expectedAddress = '0x26b282894f3c083f05a4ceaafdd5578ac415a731265b760404ca2e2f64737438';

const b64 = key.replace(/^suiprivkey1/, '');
const raw = fromB64(b64);

console.log('Raw length:', raw.length);
console.log('First byte:', raw[0]);

// Try different extraction methods
const methods = [
  { name: 'slice(1, 33)', bytes: raw.slice(1, 33) },
  { name: 'slice(1)', bytes: raw.slice(1) },
  { name: 'slice(0, 32)', bytes: raw.slice(0, 32) },
  { name: 'slice(12, 44)', bytes: raw.slice(12, 44) },
];

for (const method of methods) {
  if (method.bytes.length === 32) {
    try {
      const kp = Ed25519Keypair.fromSecretKey(method.bytes);
      const addr = kp.toSuiAddress();
      const hex = Buffer.from(method.bytes).toString('hex');
      console.log(`\n${method.name}:`);
      console.log('  Address:', addr);
      console.log('  Matches:', addr === expectedAddress ? 'YES ✅' : 'NO ❌');
      console.log('  Hex:', hex);
      if (addr === expectedAddress) {
        console.log('\n✅ CORRECT KEY FOUND!');
        console.log('Hex key:', hex);
      }
    } catch (e) {
      console.log(`\n${method.name}: Error - ${e.message}`);
    }
  }
}
