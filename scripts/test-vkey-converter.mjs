import { convertVkeyToSuiBytes } from '../utils/vkey-converter.mjs';
import path from 'path';

const vkeyPath = path.join(process.cwd(), 'circuits', 'aggregate_count_vkey.json');

console.log('Testing Rust vkey converter...');
console.log(`Input: ${vkeyPath}`);

try {
  const bytes = await convertVkeyToSuiBytes(vkeyPath);
  console.log(`✅ Conversion successful!`);
  console.log(`   Size: ${bytes.length} bytes`);
  console.log(`   First 32 bytes (hex): ${Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('')}`);
} catch (error) {
  console.error('❌ Conversion failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
