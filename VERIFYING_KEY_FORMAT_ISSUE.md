# Verifying Key Format Issue

## Problem

Proof submission is failing with `MoveAbort` error code `0` (`EInvalidVerifyingKey`) when calling `prepare_verifying_key` in Sui's groth16 module.

## Current Status

- ✅ Rust converter created to convert snarkjs JSON to Arkworks canonical format
- ✅ Converter successfully produces binary output (296 bytes compressed, 584 bytes uncompressed)
- ❌ Sui still rejects the format with `EInvalidVerifyingKey` error

## What We've Tried

1. **Compressed format** (`Compress::Yes`) - 296 bytes
   - Sui docs say "canonical compressed serialization"
   - Still fails with `EInvalidVerifyingKey`

2. **Uncompressed format** (`Compress::No`) - 584 bytes
   - Still fails with `EInvalidVerifyingKey`

## Root Cause

The issue is that Sui's native `prepare_verifying_key_internal` function is rejecting our Arkworks-serialized verification key. This suggests:

1. **Version mismatch**: Sui may be using a different version of Arkworks than we are (0.4)
2. **Format difference**: Sui may expect a different serialization format than standard Arkworks `CanonicalSerialize`
3. **Struct construction**: Our manual construction of `VerifyingKey` from snarkjs JSON may not match what Sui expects

## Possible Solutions

### Option 1: Use `ark-circom` library
The `ark-circom` crate is specifically designed for Circom compatibility and may produce the correct format:

```rust
// Add to Cargo.toml
ark-circom = "0.4"
```

### Option 2: Check Sui source code
Examine Sui's native Rust code to see exactly how it deserializes verification keys:
- Location: `sui/crates/sui-framework/src/natives/crypto/groth16.rs`
- This will show the exact format expected

### Option 3: Use Sui's example format
The Sui documentation shows an example verification key (512 bytes / 256 hex chars). Compare our output to this format.

### Option 4: Contact Sui team
If the above don't work, contact Sui developers for clarification on:
- Exact Arkworks version they use
- Exact serialization format expected
- Any special requirements for BN254 curve

## Next Steps

1. Try using `ark-circom` to convert from snarkjs format
2. Check Sui's source code for the exact deserialization logic
3. Compare our output with Sui's example verification key format
4. If still failing, contact Sui team for support

## Files

- Converter: `vkey-converter/src/main.rs`
- Wrapper: `utils/vkey-converter.mjs`
- Controller: `controllers/proofSubmissionController.js`

## Error Details

```
Transaction: AGqJXqcPDfeDDQfGTWLjY2nWkQuYutJELBHVY2aE2yzG
Error: MoveAbort(MoveLocation { module: ModuleId { address: 31987d757e1fd70467098f3672095886fa7e079989c1c6837cc59e57a4f4e8e0, name: Identifier("ProofVerifier") }, function: 3, instruction: 50, function_name: Some("verify_proof_with_key") }, 0)
```

Error code `0` = `EInvalidVerifyingKey` from Sui's groth16 module.
