#!/usr/bin/env node
// Script to register all verifying keys for common circuits
// Usage: node scripts/register-all-verifying-keys.mjs

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const circuits = [
  'aggregate_count',
  'aggregate_sum',
  'range_count',
  'range_sum',
  // Add more circuits as needed
];

console.log('🔑 Registering verifying keys for all circuits...\n');

for (const circuit of circuits) {
  try {
    console.log(`\n📦 Registering ${circuit}...`);
    execSync(`node scripts/register-verifying-keys.mjs ${circuit}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    console.log(`✅ ${circuit} registered successfully`);
  } catch (err) {
    console.error(`❌ Failed to register ${circuit}:`, err.message);
    // Continue with next circuit
  }
}

console.log('\n✅ Done registering all verifying keys!');
