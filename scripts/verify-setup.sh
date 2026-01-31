#!/bin/bash
# Verification script to check if everything is set up correctly

set -e

echo "🔍 Verifying Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    VERSION=$(node --version)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${RED}❌ Not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    VERSION=$(npm --version)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${RED}❌ Not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker
echo -n "Checking Docker... "
if command -v docker &> /dev/null; then
    VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${RED}❌ Not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker Compose
echo -n "Checking Docker Compose... "
if command -v docker-compose &> /dev/null; then
    VERSION=$(docker-compose --version | cut -d' ' -f4 | cut -d',' -f1)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (docker compose plugin may be available)${NC}"
fi

# Check Sui CLI
echo -n "Checking Sui CLI... "
if command -v sui &> /dev/null; then
    VERSION=$(sui --version 2>&1 | head -n1)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (needed for Move contract deployment)${NC}"
fi

# Check Walrus CLI
echo -n "Checking Walrus CLI... "
if command -v walrus &> /dev/null; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (needed for dataset storage)${NC}"
fi

# Check Circom
echo -n "Checking Circom... "
if command -v circom &> /dev/null; then
    VERSION=$(circom --version)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (needed for circuit compilation)${NC}"
fi

# Check snarkjs
echo -n "Checking snarkjs... "
if command -v snarkjs &> /dev/null; then
    VERSION=$(snarkjs --version)
    echo -e "${GREEN}✅ $VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (needed for proof generation)${NC}"
fi

# Check .env file
echo -n "Checking .env file... "
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${YELLOW}⚠️  Not found (copy from .env.example)${NC}"
fi

# Check node_modules
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ Installed${NC}"
else
    echo -e "${YELLOW}⚠️  Not installed (run: npm install)${NC}"
fi

# Check Move contracts
echo -n "Checking Move contracts... "
if [ -d "move/dataset_registry" ] && [ -d "move/proof_verifier" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ Move contracts not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check circuits
echo -n "Checking ZK circuits... "
if [ -f "circuits/aggregate_count.circom" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${YELLOW}⚠️  Circuits not found${NC}"
fi

# Check Dockerfile
echo -n "Checking Dockerfile... "
if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ Dockerfile not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check docker-compose.yml
echo -n "Checking docker-compose.yml... "
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✅ Found${NC}"
else
    echo -e "${RED}❌ docker-compose.yml not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Setup verification complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure .env file"
    echo "2. Run: npm install"
    echo "3. Run: npm start"
    echo "4. See NEXT_STEPS.md for deployment guide"
else
    echo -e "${RED}❌ Found $ERRORS critical issues${NC}"
    echo "Please fix the issues above before proceeding"
fi
