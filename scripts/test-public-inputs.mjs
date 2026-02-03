import { readFileSync } from 'fs';
import { preparePublicInputsForSui } from '../utils/sui.mjs';

const publicSignals = JSON.parse(readFileSync('downloads/witness_WvxtYhk_RLEHIDoIKQvx9wLrvkIcgdohFpl14OCxJyo_public.json', 'utf8'));
const result = preparePublicInputsForSui(publicSignals);

console.log('Public signals:', publicSignals);
console.log('\nPublic inputs bytes length:', result.length);
console.log('Expected: 32 bytes per signal (little-endian)');
console.log('Number of signals:', publicSignals.length);
console.log('Total bytes:', result.length);
console.log('\nPublic inputs (hex):', Buffer.from(result).toString('hex'));
console.log('\nSui example public inputs:');
console.log('0100000001000000000000000000000000000000000000000000000000000000');
console.log('(This is 2 public inputs, each 32 bytes little-endian)');
