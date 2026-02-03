#!/usr/bin/env node
// Script to list all registered verifying keys

import { getSuiClient, queryRegisteredVerifyingKeys } from '../utils/sui.mjs';
import dotenv from 'dotenv';

dotenv.config();

const suiNetwork = process.env.SUI_NETWORK || 'testnet';
const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID || process.env.VERIFIER_PACKAGE_ID;

if (!proofVerifierPackageId) {
  console.error('Error: PROOF_VERIFIER_PACKAGE_ID not set in .env');
  process.exit(1);
}

const client = getSuiClient(suiNetwork);

console.log(`Querying registered verifying keys for package: ${proofVerifierPackageId}\n`);

queryRegisteredVerifyingKeys(client, proofVerifierPackageId)
  .then((keys) => {
    console.log(`\n✅ Found ${keys.length} registered verifying key(s):`);
    keys.forEach(key => console.log(`  - ${key}`));
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
