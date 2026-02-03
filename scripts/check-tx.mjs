import { getSuiClient, checkTransactionStatus } from '../utils/sui.mjs';

const transactionDigest = process.argv[2] || 'AGqJXqcPDfeDDQfGTWLjY2nWkQuYutJELBHVY2aE2yzG';
const suiNetwork = process.env.SUI_NETWORK || 'testnet';

console.log(`Checking transaction: ${transactionDigest}`);
console.log(`Network: ${suiNetwork}\n`);

const client = getSuiClient(suiNetwork);

try {
  const tx = await checkTransactionStatus(client, transactionDigest);
  
  console.log('Transaction Status:', tx.effects?.status?.status || 'unknown');
  console.log('Events Count:', tx.events?.length || 0);
  console.log('');
  
  if (tx.events && tx.events.length > 0) {
    console.log('Events:');
    tx.events.forEach((event, i) => {
      console.log(`\n[${i + 1}] Type: ${event.type}`);
      console.log('     Data:', JSON.stringify(event.parsedJson, null, 2));
    });
  } else {
    console.log('⚠️  No events found in transaction');
    console.log('\nPossible reasons:');
    console.log('  1. Transaction failed (check status above)');
    console.log('  2. Events not emitted by the contract');
    console.log('  3. Events are still being indexed (wait a few seconds)');
  }
  
  if (tx.effects?.status?.status === 'failure') {
    console.log('\n❌ Transaction failed!');
    console.log('Error:', JSON.stringify(tx.effects.status.error, null, 2));
  }
} catch (error) {
  console.error('❌ Error checking transaction:', error.message);
  console.error(error.stack);
  process.exit(1);
}
