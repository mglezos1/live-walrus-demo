// Get private key in hex format from Sui bech32 format
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

const bech32Key = process.argv[2] || 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t';

try {
  // Import the keypair from bech32 format
  const keypair = Ed25519Keypair.fromSecretKey(
    fromB64(bech32Key.replace('suiprivkey1', ''))
  );
  
  // Get the secret key bytes
  const secretKey = keypair.getSecretKey();
  const hexKey = Buffer.from(secretKey).toString('hex');
  console.log(hexKey);
} catch (error) {
  // Try alternative method
  try {
    const keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(bech32Key, 'base64')
    );
    const secretKey = keypair.getSecretKey();
    const hexKey = Buffer.from(secretKey).toString('hex');
    console.log(hexKey);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
