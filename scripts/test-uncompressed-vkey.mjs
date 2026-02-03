// Test proof submission with uncompressed verification key
import { convertVkeyToSuiBytes } from '../utils/vkey-converter.mjs';
import path from 'path';

const vkeyPath = path.join(process.cwd(), 'circuits', 'aggregate_count_vkey.json');

console.log('Testing with uncompressed verification key format...');
console.log(`Input: ${vkeyPath}`);

try {
  const bytes = await convertVkeyToSuiBytes(vkeyPath);
  console.log(`✅ Conversion successful!`);
  console.log(`   Size: ${bytes.length} bytes`);
  console.log(`   Format: uncompressed (as per zkVerify docs)`);
  console.log(`\n⚠️  Note: The converter now uses uncompressed format.`);
  console.log(`   If this still fails, we may need to check fastcrypto's exact format requirements.`);
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
