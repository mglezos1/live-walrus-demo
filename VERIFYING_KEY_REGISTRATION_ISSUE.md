# Verifying Key Registration Issue

## Problem

The verifying key registration is failing because Sui's `prepare_verifying_key` expects the verification key bytes in **Arkworks canonical format**, which is difficult to produce from JavaScript/snarkjs.

## Current Status

- ✅ Verification key serialization function created (`utils/vkey-serializer.mjs`)
- ❌ Registration transactions are failing with error: `MoveAbort in groth16::prepare_verifying_key_internal`
- ❌ No verifying keys are currently registered on-chain
- ❌ Proof submissions fail with `E_VERIFYING_KEY_NOT_FOUND`

## Error Details

Transaction `CYSjgZuVu153GV4dTircU5GbSwExBbW1zLkp62Lhnc5i` failed with:
```
MoveAbort(MoveLocation { module: ModuleId { address: 0000000000000000000000000000000000000000000000000000000000000002, name: Identifier("groth16") }, function: 7, instruction: 0, function_name: Some("prepare_verifying_key_internal") }, 0) in command 0
```

## Root Cause

Sui's `prepare_verifying_key` expects verification key bytes in **Arkworks canonical compressed format**. The current serialization attempts (little-endian, big-endian) don't match this format.

## Solutions

### Option 1: Use Rust Tool to Convert Verification Keys (Recommended)

Create a Rust tool using Arkworks to convert snarkjs verification keys to Sui format:

1. Read the verification key JSON from snarkjs
2. Convert to Arkworks format
3. Serialize using Arkworks canonical format
4. Register on-chain

### Option 2: Modify Contract to Accept Verification Key Components

Instead of registering prepared verifying keys, modify the contract to:
- Accept verification key components separately
- Prepare the verifying key on-the-fly during proof verification
- Less efficient but avoids serialization issues

### Option 3: Use Sui CLI or SDK with Proper Format

If Sui provides tools or examples for registering verification keys, use those instead.

## Current Workaround

For now, proofs cannot be verified on-chain because no verifying keys are registered. The system will work once verifying keys are properly registered.

## Next Steps

1. Research Sui's exact verification key format requirements
2. Create a Rust conversion tool or find an existing one
3. Or modify the contract to prepare verifying keys on-the-fly
