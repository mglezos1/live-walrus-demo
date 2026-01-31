#!/bin/bash
# Script to deploy all Move contracts to Sui

set -e

echo "🚀 Deploying Move Contracts to Sui..."

# Check if sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo "❌ Sui CLI not found. Please install from https://docs.sui.io/build/install"
    exit 1
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to deploy a contract
deploy_contract() {
    local contract_dir=$1
    local contract_name=$2
    
    echo -e "${YELLOW}📦 Deploying $contract_name...${NC}"
    cd "$contract_dir"
    
    # Build
    sui move build
    
    # Publish
    echo -e "${YELLOW}Publishing $contract_name...${NC}"
    sui client publish --gas-budget 100000000
    
    echo -e "${GREEN}✅ $contract_name deployed!${NC}"
    echo ""
    echo "⚠️  IMPORTANT: Save the Package ID from above and add it to .env"
    echo ""
    
    cd - > /dev/null
}

# Deploy Dataset Registry
deploy_contract "move/dataset_registry" "DatasetRegistry"

# Deploy Proof Verifier
deploy_contract "move/proof_verifier" "ProofVerifier"

# Deploy Capability Registry
deploy_contract "move/capability_registry" "CapabilityRegistry"

# Deploy Verifier
deploy_contract "move/verifier" "Verifier"

echo -e "${GREEN}✅ All contracts deployed!${NC}"
echo ""
echo "Next steps:"
echo "1. Initialize each registry using sui client call"
echo "2. Add Package IDs to .env file"
echo "3. Register verifying keys for circuits"
echo "See DEPLOYMENT.md for details"
