#!/usr/bin/env node
// Script to check transaction status and events

import { getSuiClient, checkTransactionStatus, queryRegisteredVerifyingKeys } from '../utils/sui.mjs';
import dotenv from 'dotenv';

dotenv.config();

const transactionDigest = process.argv[2];

if (!transactionDigest) {
  console.error('Usage: node scripts/check-transaction.mjs <transaction_digest>');
  process.exit(1);
}

const suiNetwork = process.env.SUI_NETWORK || 'testnet';
const client = getSuiClient(suiNetwork);

console.log(`Checking transaction: ${transactionDigest}\n`);

checkTransactionStatus(client, transactionDigest)
  .then((tx) => {
    console.log('\n✅ Transaction check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
