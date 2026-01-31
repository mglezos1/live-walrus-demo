# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js
node --version  # Should be 20+

# Check Docker
docker --version
docker-compose --version

# Check Sui CLI
sui --version

# Check Walrus CLI
walrus --version
```

## Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

```bash
cp .env.example .env
# Edit .env with your Sui wallet path
```

### 3. Start Backend (Development)

```bash
npm start
```

The server will start on http://localhost:3000

### 4. Access Frontend

Open your browser:
- **Owner Portal**: http://localhost:3000/frontend/owner.html
- **Researcher Portal**: http://localhost:3000/frontend/researcher.html  
- **Verifier Portal**: http://localhost:3000/frontend/verifier.html

## Test the System

### 1. Upload a Test Dataset

Create `test_dataset.json`:
```json
[
  {"age": 25, "condition": "diabetes"},
  {"age": 30, "condition": "hypertension"},
  {"age": 18, "condition": "diabetes"}
]
```

Upload via Owner Portal or:
```bash
curl -X POST http://localhost:3000/datasets/upload \
  -F "file=@test_dataset.json"
```

### 2. Issue a Capability

Via Owner Portal or:
```bash
curl -X POST http://localhost:3000/capabilities/issue \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id_hash": "your_dataset_hash",
    "query_type": "aggregate",
    "query_params": {"field": "age", "operator": ">", "value": 18}
  }'
```

### 3. Generate a Proof

Via Researcher Portal or:
```bash
curl -X POST http://localhost:3000/proofs/generate \
  -H "Content-Type: application/json" \
  -d '{
    "blob_id": "your_blob_id",
    "capability_id": "your_capability_id",
    "proof_type": "count_aggregate"
  }'
```

## Docker Quick Start

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Next Steps

For full deployment including Move contracts and ZK circuits, see [DEPLOYMENT.md](DEPLOYMENT.md).
