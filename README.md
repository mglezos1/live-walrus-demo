# Zero-Knowledge Medical Dataset Access System

A zero-knowledge, capability-based access control system for medical datasets on Sui blockchain with Walrus protocol storage.

## Overview

This system enables:
- **Data Owners**: Upload datasets once, issue capabilities to researchers
- **Researchers**: Generate zero-knowledge proofs about specific properties of data using owner-issued capabilities
- **Verifiers**: Verify proofs on-chain without trusting the backend, relying only on proofs and public outputs

## Architecture

### Components

1. **Sui Move Contracts** (`move/`)
   - `DatasetRegistry`: Stores dataset hashes on-chain
   - `ProofVerifier`: Verifies Groth16 ZK proofs on-chain
   - `CapabilityRegistry`: Verifies capabilities on-chain
   - `Verifier`: Queries proof results

2. **Backend Services** (`controllers/`, `routes/`)
   - Dataset upload with encryption and hashing
   - Capability issuance with cryptographic signatures
   - Unified proof generation supporting multiple query types
   - Proof submission to Sui blockchain

3. **Zero-Knowledge Circuits** (`circuits/`)
   - Aggregate proofs (count, sum, average)
   - Range queries (range count, range sum)
   - Condition queries (single and multi-condition)
   - Capability-bound circuits

4. **Frontend Interfaces** (`frontend/`)
   - Data Owner Portal (`owner.html`)
   - Researcher Portal (`researcher.html`)
   - Verifier Portal (`verifier.html`)

## Setup

**Hosted testnet (Docker + Walrus/Sui on a VPS):** see [docs/DEPLOY-DOCKER.md](docs/DEPLOY-DOCKER.md).


**Simplest hosted Walrus (real, not demo):** [docs/SIMPLE-VPS.md](docs/SIMPLE-VPS.md)

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Sui CLI
- Walrus CLI
- Circom and snarkjs

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mglezos1/walrus-mvp.git
cd walrus-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build and run with Docker:
```bash
docker-compose up -d
```

## Usage

### Data Owner

1. Access the owner portal at `http://localhost:3000/frontend/owner.html`
2. Upload a dataset (JSON format)
3. Issue capabilities to researchers with specific query permissions

### Researcher

1. Access the researcher portal at `http://localhost:3000/frontend/researcher.html`
2. Select an available capability
3. Generate a ZK proof for a dataset
4. Submit the proof to the Sui blockchain

### Verifier

1. Access the verifier portal at `http://localhost:3000/frontend/verifier.html`
2. Query proofs by proof ID or dataset blob ID
3. Verify proof validity on-chain

## API Endpoints

### Datasets
- `POST /datasets/upload` - Upload dataset
- `GET /datasets` - List datasets
- `GET /datasets/:blobId` - Get dataset metadata

### Capabilities
- `POST /capabilities/issue` - Issue capability
- `GET /capabilities` - List capabilities
- `GET /capabilities/:id` - Get capability details

### Proofs
- `POST /proofs/generate` - Generate ZK proof
- `POST /proofs/submit` - Submit proof to blockchain
- `GET /proofs/:proofId/status` - Get proof status

### Verifier
- `GET /verifier/proofs/:proofId` - Get verified proof result
- `GET /verifier/datasets/:blobId/proofs` - List proofs for dataset

## Deployment

### Local Deployment with Cloudflare Tunnel

1. Set up Cloudflare Tunnel:
```bash
./scripts/setup-cloudflare.sh
```

2. Configure tunnel in `cloudflare/config.yml`

3. Deploy:
```bash
./scripts/deploy.sh
```

### GitHub Actions

The repository includes CI/CD workflows:
- **CI Pipeline**: Tests and builds on push/PR
- **Auto Commit**: Daily commits of generated files

## Development

### Move Contracts

Deploy Move contracts to Sui:
```bash
cd move/dataset_registry
sui move build
sui client publish
```

### Circuits

Compile Circom circuits:
```bash
cd circuits
circom aggregate_count.circom --r1cs --wasm --sym
```

## Security Considerations

- Datasets are encrypted before upload to Walrus
- Only dataset hashes are stored on-chain
- Capabilities are cryptographically signed
- Proofs are verified on-chain using Groth16
- Verifiers don't need to trust the backend

## License

[Add your license here]

## Contributing

[Add contributing guidelines]
