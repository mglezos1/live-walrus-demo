# Configuration Complete ✅

The `.env` file has been configured for Walrus and Sui integration.

## ✅ Completed Configuration

1. **Sui Network**: Set to `devnet`
2. **Sui Wallet Path**: Configured to `~/.sui/sui_config/client.yaml`
3. **Active Sui Address**: `0x26b282894f3c083f05a4ceaafdd5578ac415a731265b760404ca2e2f64737438`
4. **Walrus CLI**: Found at `/usr/local/bin/walrus`
5. **Bech32 Private Key**: Exported and documented in `.env`

## ⚠️ Remaining Steps

### 1. Convert Private Key to Hex Format

The private key is currently in bech32 format:
```
suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t
```

You need to convert it to a 64-character hex string for `SUI_PRIVATE_KEY` in `.env`.

**Option A: Using Node.js (when available)**
```bash
cd walrus-mvp-demo
node scripts/convert-sui-key.js suiprivkey1qrlgwn3vrmm7w0lpjpl66jmdyxsx2fhk559vwqknt943tk3ntjg4v06hk9t
```

**Option B: Manual conversion**
- The bech32 key needs to be decoded and converted to hex
- You can use online tools or Python scripts (see `scripts/convert_key.py`)

Once converted, update `.env`:
```env
SUI_PRIVATE_KEY=<64_character_hex_string>
```

### 2. Deploy Move Contracts

The Move contracts need to be deployed to Sui. However, there are currently build errors due to Sui framework version compatibility issues.

**To fix and deploy:**

1. **Fix Move.toml dependencies** - Use a specific Sui commit instead of `rev = "main"`:
   ```toml
   Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "<stable_commit_hash>" }
   ```

2. **Build contracts:**
   ```bash
   cd move/dataset_registry
   sui move build
   sui client publish --gas-budget 100000000
   # Save Package ID and Object ID
   
   cd ../proof_verifier
   sui move build
   sui client publish --gas-budget 100000000
   # Save Package ID and Object ID
   
   cd ../verifier
   sui move build
   sui client publish --gas-budget 100000000
   # Save Package ID and Object ID
   ```

3. **Initialize registries:**
   ```bash
   # Initialize Dataset Registry
   sui client call \
     --package <DATASET_REGISTRY_PACKAGE_ID> \
     --module DatasetRegistry \
     --function init \
     --gas-budget 100000000
   # Save Registry Object ID
   
   # Initialize Proof Verifier
   sui client call \
     --package <PROOF_VERIFIER_PACKAGE_ID> \
     --module ProofVerifier \
     --function init \
     --gas-budget 100000000
   # Save Registry Object ID
   ```

4. **Update .env** with all Package IDs and Object IDs

## 📋 Current .env Status

```env
SUI_NETWORK=devnet ✅
SUI_WALLET_PATH=~/.sui/sui_config/client.yaml ✅
SUI_PRIVATE_KEY= ⚠️ Needs conversion from bech32 to hex
WALRUS_CLI_PATH=/usr/local/bin/walrus ✅
DATASET_REGISTRY_PACKAGE_ID= ⚠️ Needs deployment
DATASET_REGISTRY_OBJECT_ID= ⚠️ Needs deployment
PROOF_VERIFIER_PACKAGE_ID= ⚠️ Needs deployment
PROOF_VERIFIER_REGISTRY_OBJECT_ID= ⚠️ Needs deployment
VERIFIER_PACKAGE_ID= ⚠️ Needs deployment
VERIFIER_OBJECT_ID= ⚠️ Needs deployment
```

## 🚀 Testing the Integration

Once all configuration is complete:

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Test dataset upload** (should upload to Walrus and register on Sui):
   ```bash
   curl -X POST http://localhost:3000/datasets/upload \
     -F "file=@test_dataset.json"
   ```

3. **Check health:**
   ```bash
   curl http://localhost:3000/health
   ```

## 📝 Notes

- The Move contract build errors are due to Sui framework version compatibility
- The private key conversion is needed for on-chain operations
- All Walrus operations should work once the private key is set
- On-chain registration will work once contracts are deployed and Package IDs are set

## 🔧 Helper Scripts

- `scripts/setup-env.sh` - Automated .env setup
- `scripts/convert-sui-key.js` - Convert bech32 key to hex (requires Node.js)
- `scripts/convert_key.py` - Convert bech32 key to hex (requires Python bech32)
