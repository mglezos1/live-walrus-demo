#!/bin/bash
# Script to generate zkey files for compiled circuits

set -e

echo "🔑 Generating zkey files..."

cd circuits

# Check if pot12_final.ptau exists
if [ ! -f "pot12_final.ptau" ]; then
    echo "❌ pot12_final.ptau not found. Generating powers of tau..."
    echo "This may take a while..."
    
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
fi

# Generate zkey for aggregate_count
if [ -f "aggregate_count.r1cs" ] && [ ! -f "aggregate_count.zkey" ]; then
    echo "📦 Generating zkey for aggregate_count..."
    snarkjs groth16 setup aggregate_count.r1cs pot12_final.ptau aggregate_count_0000.zkey
    snarkjs zkey contribute aggregate_count_0000.zkey aggregate_count.zkey --name="Contributor" -v
    echo "✅ aggregate_count.zkey generated"
fi

# Generate zkey for aggregate_sum
if [ -f "aggregate_sum.r1cs" ] && [ ! -f "aggregate_sum.zkey" ]; then
    echo "📦 Generating zkey for aggregate_sum..."
    snarkjs groth16 setup aggregate_sum.r1cs pot12_final.ptau aggregate_sum_0000.zkey
    snarkjs zkey contribute aggregate_sum_0000.zkey aggregate_sum.zkey --name="Contributor" -v
    echo "✅ aggregate_sum.zkey generated"
fi

# Generate zkey for range_count
if [ -f "range_count.r1cs" ] && [ ! -f "range_count.zkey" ]; then
    echo "📦 Generating zkey for range_count..."
    snarkjs groth16 setup range_count.r1cs pot12_final.ptau range_count_0000.zkey
    snarkjs zkey contribute range_count_0000.zkey range_count.zkey --name="Contributor" -v
    echo "✅ range_count.zkey generated"
fi

echo "✅ Zkey generation complete!"
