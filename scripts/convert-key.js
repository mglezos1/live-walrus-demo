// Convert Sui bech32 private key to hex format
import { bech32 } from 'bech32';

const bech32Key = process.argv[2] || 'suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t';

try {
  const decoded = bech32.decode(bech32Key);
  // Skip the first word (version byte) and convert to hex
  const hexKey = Buffer.from(bech32.toWords(Buffer.from(decoded.words.slice(1)))).toString('hex');
  console.log(hexKey);
} catch (error) {
  console.error('Error converting key:', error.message);
  process.exit(1);
}
