# Deployment Guide

This guide walks you through deploying the Zero-Knowledge Medical Dataset Access System.

## Prerequisites

1. **Node.js 20+** - Install from [nodejs.org](https://nodejs.org/)
2. **Docker & Docker Compose** - Install from [docker.com](https://www.docker.com/)
3. **Sui CLI** - Install from [docs.sui.io](https://docs.sui.io/build/install)
4. **Walrus CLI** - Install from Sui documentation
5. **Circom & snarkjs** - Will be installed via npm

## Step 1: Install Dependencies

```bash
npm install
```

This will install:
- Express.js backend dependencies
- Sui SDK (`@mysten/sui.js`)
- Circomlib and snarkjs for ZK proofs

## Step 2: Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=production
PORT=3000

# Sui Configuration
SUI_NETWORK=devnet
SUI_WALLET_PATH=~/.sui/sui_config/client.yaml
SUI_PRIVATE_KEY=your_private_key_here

# Move Contract Package IDs (set after deployment)
DATASET_REGISTRY_PACKAGE_ID=
PROOF_VERIFIER_PACKAGE_ID=
CAPABILITY_REGISTRY_PACKAGE_ID=
VERIFIER_PACKAGE_ID=

# Walrus Configuration
WALRUS_CLI_PATH=/usr/local/bin/walrus

# Circuit Configuration
CIRCUITS_DIR=./circuits
ZKEY_DIR=./circuits
DATA_DIR=./data
```

## Step 3: Deploy Move Contracts to Sui

### 3.1 Deploy Dataset Registry

```bash
cd move/dataset_registry
sui move build
sui client publish --gas-budget 100000000
```

Save the **Package ID** from the output and add it to `.env` as `DATASET_REGISTRY_PACKAGE_ID`.

### 3.2 Initialize Registry

After deployment, initialize the registry:

```bash
sui client call \
  --package <DATASET_REGISTRY_PACKAGE_ID> \
  --module DatasetRegistry \
  --function init \
  --gas-budget 100000000
```

### 3.3 Deploy Proof Verifier

```bash
cd ../proof_verifier
sui move build
sui client publish --gas-budget 100000000
```

Save the **Package ID** and add to `.env` as `PROOF_VERIFIER_PACKAGE_ID`.

### 3.4 Initialize Proof Verifier

```bash
sui client call \
  --package <PROOF_VERIFIER_PACKAGE_ID> \
  --module ProofVerifier \
  --function init \
  --gas-budget 100000000
```

### 3.5 Deploy Capability Registry

```bash
cd ../capability_registry
sui move build
sui client publish --gas-budget 100000000
```

Save the **Package ID** and add to `.env` as `CAPABILITY_REGISTRY_PACKAGE_ID`.

### 3.6 Deploy Verifier Contract

```bash
cd ../verifier
sui move build
sui client publish --gas-budget 100000000
```

Save the **Package ID** and add to `.env` as `VERIFIER_PACKAGE_ID`.

## Step 4: Compile ZK Circuits

### 4.1 Install Circom (if not already installed)

```bash
npm install -g circom snarkjs
```

### 4.2 Compile Aggregate Circuits

```bash
cd circuits

# Count circuit
circom aggregate_count.circom --r1cs --wasm --sym

# Sum circuit
circom aggregate_sum.circom --r1cs --wasm --sym

# Average circuit
circom aggregate_avg.circom --r1cs --wasm --sym
```

### 4.3 Compile Range Circuits

```bash
circom range_count.circom --r1cs --wasm --sym
circom range_sum.circom --r1cs --wasm --sym
```

### 4.4 Compile Condition Circuits

```bash
circom condition_count.circom --r1cs --wasm --sym
circom multi_condition.circom --r1cs --wasm --sym
```

### 4.5 Generate zkey Files

For each circuit, generate a zkey file:

```bash
# Example for aggregate_count
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
snarkjs groth16 setup aggregate_count.r1cs pot12_final.ptau aggregate_count_0000.zkey
snarkjs zkey contribute aggregate_count_0000.zkey aggregate_count.zkey --name="Contributor" -v
snarkjs zkey export verificationkey aggregate_count.zkey aggregate_count_vkey.json
```

**Note**: For production, use a trusted setup ceremony. The above is for testing only.

## Step 5: Register Verifying Keys On-Chain

For each circuit, register its verifying key:

```bash
# Read the verifying key
cat aggregate_count_vkey.json

# Register it (you'll need to convert to bytes format)
sui client call \
  --package <PROOF_VERIFIER_PACKAGE_ID> \
  --module ProofVerifier \
  --function register_verifying_key \
  --args "aggregate_count" "<verifying_key_bytes>" \
  --gas-budget 100000000
```

## Step 6: Set Up Cloudflare Tunnel (Optional)

### 6.1 Install cloudflared

```bash
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# macOS
brew install cloudflared
```

### 6.2 Create Tunnel

```bash
cloudflared tunnel create walrus-mvp
```

### 6.3 Get Tunnel Credentials

```bash
cloudflared tunnel token walrus-mvp > cloudflare/credentials.json
```

### 6.4 Update Config

Edit `cloudflare/config.yml` and replace `<tunnel-id>` with your tunnel ID.

### 6.5 Route DNS

In Cloudflare Dashboard:
1. Go to your domain
2. Add CNAME record: `walrus-mvp` → `<tunnel-id>.cfargotunnel.com`

## Step 7: Deploy Backend

### Option A: Docker Compose (Recommended)

```bash
# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Check health
curl http://localhost:3000/health
```

### Option B: Direct Node.js

```bash
# Start server
npm start

# Or with PM2 for production
pm2 start app.js --name walrus-mvp
```

## Step 8: Verify Deployment

### 8.1 Check Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-30T..."}
```

### 8.2 Test Dataset Upload

```bash
curl -X POST http://localhost:3000/datasets/upload \
  -F "file=@test_dataset.json"
```

### 8.3 Access Frontend

- Data Owner: http://localhost:3000/frontend/owner.html
- Researcher: http://localhost:3000/frontend/researcher.html
- Verifier: http://localhost:3000/frontend/verifier.html

## Step 9: GitHub Integration

### 9.1 Initialize Git Repository

```bash
git init
git remote add origin https://github.com/mglezos1/walrus-mvp.git
```

### 9.2 First Commit

```bash
git add .
git commit -m "feat: initial implementation of ZK medical dataset access system"
git push -u origin main
```

### 9.3 Verify CI/CD

The GitHub Actions workflows will automatically:
- Run tests on push/PR
- Build Docker image
- Publish to GitHub Container Registry (on main branch)

## Troubleshooting

### Move Contract Build Errors

- Ensure Sui CLI is up to date: `sui update`
- Check Move.toml dependencies are correct
- Verify network connectivity for git dependencies

### Circuit Compilation Errors

- Ensure Circom 2.1.4+ is installed
- Check circuit syntax matches Circom version
- Verify all included libraries are available

### Docker Build Errors

- Ensure Docker is running
- Check Dockerfile syntax
- Verify all dependencies in package.json

### Backend Connection Errors

- Check `.env` file is configured correctly
- Verify Sui wallet path is accessible
- Ensure Walrus CLI is installed and in PATH

## Production Considerations

1. **Security**:
   - Use strong encryption keys
   - Store private keys securely (use secrets management)
   - Enable HTTPS (via Cloudflare Tunnel)
   - Implement rate limiting

2. **Performance**:
   - Use production-grade Sui RPC endpoints
   - Optimize circuit compilation
   - Cache verifying keys
   - Use connection pooling

3. **Monitoring**:
   - Set up logging (Winston, Pino)
   - Monitor Sui transaction fees
   - Track proof generation times
   - Alert on errors

4. **Scaling**:
   - Use load balancer for multiple backend instances
   - Consider proof generation queue (Bull, RabbitMQ)
   - Database for capability storage (PostgreSQL, MongoDB)
   - CDN for frontend assets

## Next Steps

1. Write integration tests
2. Add Move contract tests
3. Set up monitoring and alerts
4. Configure production Sui network
5. Implement database for persistent storage
6. Add API authentication/authorization
