import { readFileSync } from 'fs';
import { prepareProofForSui } from '../utils/sui.mjs';

const proof = JSON.parse(readFileSync('downloads/witness_WvxtYhk_RLEHIDoIKQvx9wLrvkIcgdohFpl14OCxJyo_proof.json', 'utf8'));
const result = prepareProofForSui(proof);

console.log('Proof points bytes length:', result.proof_points_bytes.length);
console.log('Expected: 256 bytes (A:64 + B:128 + C:64)');
console.log('\nFirst 32 bytes (A.x, hex):', Buffer.from(result.proof_points_bytes.slice(0, 32)).toString('hex'));
console.log('Next 32 bytes (A.y, hex):', Buffer.from(result.proof_points_bytes.slice(32, 64)).toString('hex'));
console.log('\nSui example proof (first 64 bytes):');
console.log('212d4457550f258654a24a6871522797ab262dee4d7d1f89af7da90dc0904eac57ce183e6f7caca9a98755904c1398ff');
console.log('\nOur proof (first 64 bytes):');
console.log(Buffer.from(result.proof_points_bytes.slice(0, 64)).toString('hex'));
