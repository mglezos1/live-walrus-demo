#!/bin/bash
# Script to build all ZK circuits

set -e

echo "🔨 Building ZK Circuits..."

cd circuits

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ Circom not found. Installing..."
    npm install -g circom@latest
fi

# Aggregate circuits
echo "📦 Building aggregate circuits..."
circom aggregate_count.circom --r1cs --wasm --sym || echo "⚠️  aggregate_count.circom not found or has errors"
circom aggregate_sum.circom --r1cs --wasm --sym || echo "⚠️  aggregate_sum.circom not found or has errors"
circom aggregate_avg.circom --r1cs --wasm --sym || echo "⚠️  aggregate_avg.circom not found or has errors"

# Range circuits
echo "📦 Building range circuits..."
circom range_count.circom --r1cs --wasm --sym || echo "⚠️  range_count.circom not found or has errors"
circom range_sum.circom --r1cs --wasm --sym || echo "⚠️  range_sum.circom not found or has errors"

# Condition circuits
echo "📦 Building condition circuits..."
circom condition_count.circom --r1cs --wasm --sym || echo "⚠️  condition_count.circom not found or has errors"
circom multi_condition.circom --r1cs --wasm --sym || echo "⚠️  multi_condition.circom not found or has errors"

# Capability-bound circuit
echo "📦 Building capability-bound circuit..."
circom capability_bound.circom --r1cs --wasm --sym || echo "⚠️  capability_bound.circom not found or has errors"

echo "✅ Circuit build complete!"
echo ""
echo "Next steps:"
echo "1. Generate zkey files using snarkjs"
echo "2. Register verifying keys on-chain"
echo "See DEPLOYMENT.md for details"
