// controllers/proofSubmissionController.js
// Proof submission service to Sui blockchain

import { getSuiClient, submitProof, submitProofWithKey, prepareProofForSui, preparePublicInputsForSui } from '../utils/sui.mjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { convertVkeyToSuiBytes } from '../utils/vkey-converter.mjs';
import { convertProofToSuiBytes } from '../utils/proof-converter.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Submit proof to Sui blockchain for on-chain verification
 * POST /proofs/submit
 * Body: {
 *   proof_id: string,
 *   blob_id: string,
 *   proof: object (from snarkjs),
 *   public_signals: array,
 *   circuit_id: string,
 *   public_output: number|string
 * }
 */
export async function submitProofController(req, res) {
  try {
    const {
      proof_id,
      blob_id,
      proof,
      public_signals,
      circuit_id,
      public_output,
    } = req.body;

    // Validate required fields
    if (!proof_id || !blob_id || !proof || !public_signals || !circuit_id) {
      return res.status(400).json({
        error: 'proof_id, blob_id, proof, public_signals, and circuit_id are required'
      });
    }

    // Get Sui configuration
    const suiNetwork = process.env.SUI_NETWORK || 'testnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID;
    const proofVerifierRegistryObjectId = process.env.PROOF_VERIFIER_REGISTRY_OBJECT_ID;
    
    if (!proofVerifierPackageId) {
      return res.status(500).json({
        error: 'PROOF_VERIFIER_PACKAGE_ID not configured',
        message: 'To submit proofs to the blockchain, you need to deploy the ProofVerifier Move contract and set PROOF_VERIFIER_PACKAGE_ID in your .env file.',
        instructions: {
          step1: 'Deploy the ProofVerifier contract:',
          step1_cmd: 'cd move/proof_verifier && sui move build && sui client publish --gas-budget 100000000',
          step2: 'Copy the Package ID from the output',
          step3: 'Initialize the registry and copy the Registry Object ID',
          step4: 'Add both to your .env file:',
          step4_example: 'PROOF_VERIFIER_PACKAGE_ID=0x...\nPROOF_VERIFIER_REGISTRY_OBJECT_ID=0x...',
          step5: 'Restart your backend server',
          note: 'See DEPLOYMENT.md for detailed instructions. For local testing without blockchain, you can skip proof submission.'
        }
      });
    }
    
    if (!proofVerifierRegistryObjectId) {
      return res.status(500).json({
        error: 'PROOF_VERIFIER_REGISTRY_OBJECT_ID not configured',
        message: 'The Registry Object ID is required to submit proofs. This is created when you initialize the ProofVerifier contract.',
        instructions: {
          step1: 'After deploying ProofVerifier, initialize it:',
          step1_cmd: `sui client call --package ${proofVerifierPackageId} --module ProofVerifier --function init --gas-budget 100000000`,
          step2: 'Copy the Registry Object ID from the output',
          step3: 'Add it to your .env file:',
          step3_example: 'PROOF_VERIFIER_REGISTRY_OBJECT_ID=0x...',
          step4: 'Restart your backend server'
        }
      });
    }

    // Initialize Sui client
    const client = getSuiClient(suiNetwork);

    // Load signer from environment or wallet
    // In production, you'd load from wallet file or environment variable
    let signer;
    if (process.env.SUI_PRIVATE_KEY) {
      const privateKeyBytes = Uint8Array.from(
        process.env.SUI_PRIVATE_KEY.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      signer = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } else {
      return res.status(500).json({
        error: 'SUI_PRIVATE_KEY not configured. Cannot sign transaction.',
        message: 'To submit proofs to the blockchain, you need to configure a Sui private key.',
        instructions: {
          step1: 'Generate a new keypair (if needed):',
          step1_cmd: 'sui keytool generate ed25519',
          step2: 'Or get your active address private key:',
          step2_cmd: 'sui client active-address',
          step3: 'Add the private key to your .env file (hex format, 64 characters):',
          step3_example: 'SUI_PRIVATE_KEY=your_64_character_hex_private_key',
          step4: 'Restart your backend server',
          note: 'Keep your private key secure! Never commit it to version control.'
        }
      });
    }

    // Convert proof using Rust converter (Arkworks format)
    // First, save proof to temp file for Rust converter
    const tmpProofPath = `/tmp/proof_${Date.now()}.json`;
    fs.writeFileSync(tmpProofPath, JSON.stringify(proof, null, 2));
    
    let proofFormatted;
    try {
      const proofBytes = await convertProofToSuiBytes(tmpProofPath);
      proofFormatted = { proof_points_bytes: Array.from(proofBytes) };
      console.log(`[PROOF-SUBMIT] Converted proof using Rust converter: ${proofBytes.length} bytes`);
    } catch (err) {
      console.warn(`[PROOF-SUBMIT] Rust converter failed, falling back to JS converter: ${err.message}`);
      // Fall back to JavaScript converter
      proofFormatted = prepareProofForSui(proof);
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tmpProofPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    const publicInputsBytes = preparePublicInputsForSui(public_signals);

    // Convert public output to bytes
    const publicOutputBytes = new TextEncoder().encode(
      typeof public_output === 'number' ? public_output.toString() : public_output
    );

    // Submit proof to blockchain
    // Try using verify_proof_with_key first (prepares key on-the-fly)
    // This avoids the need to register verifying keys beforehand
    let transactionResult;
    try {
      console.log('[PROOF-SUBMIT] Submitting proof to blockchain...', {
        packageId: proofVerifierPackageId,
        registryObjectId: proofVerifierRegistryObjectId,
        proofId: proof_id,
        blobId: blob_id,
        circuitId: circuit_id
      });
      
      // Load verification key for the circuit
      const circuitsDir = path.join(__dirname, '../circuits');
      const vkeyPath = path.join(circuitsDir, `${circuit_id}_vkey.json`);
      
      if (!fs.existsSync(vkeyPath)) {
        console.warn(`[PROOF-SUBMIT] Verification key not found at ${vkeyPath}, trying registered key approach...`);
        // Fall back to registered key approach
        transactionResult = await submitProof(
          client,
          proofVerifierPackageId,
          proofVerifierRegistryObjectId,
          proof_id,
          blob_id,
          Array.from(publicOutputBytes),
          proof,
          public_signals,
          circuit_id,
          signer
        );
            } else {
              // Load and convert verification key using Rust converter
              // Use JSON file (ark-circom/.zkey support is disabled due to compiler issues)
              const circuitsDir = path.join(__dirname, '../circuits');
              const vkeyJsonPath = path.join(circuitsDir, `${circuit_id}_vkey.json`);
              
              if (!fs.existsSync(vkeyJsonPath)) {
                console.error(`[PROOF-SUBMIT] Verification key not found: ${vkeyJsonPath}`);
                return res.status(500).json({
                  error: 'Verification key not found',
                  details: `Verification key file not found: ${vkeyJsonPath}`,
                  suggestion: 'Please ensure the verification key JSON file exists for this circuit'
                });
              }
              
              console.log(`[PROOF-SUBMIT] Loading verification key from ${vkeyJsonPath}...`);
              const verifyingKeyBytes = await convertVkeyToSuiBytes(vkeyJsonPath);
        
        console.log(`[PROOF-SUBMIT] Using verify_proof_with_key (on-the-fly key preparation)...`);
        console.log(`[PROOF-SUBMIT] Verifying key size: ${verifyingKeyBytes.length} bytes`);
        transactionResult = await submitProofWithKey(
          client,
          proofVerifierPackageId,
          proofVerifierRegistryObjectId,
          proof_id,
          blob_id,
          Array.from(publicOutputBytes),
          proofFormatted, // Pass already-formatted proof
          public_signals,
          circuit_id,
          verifyingKeyBytes,
          signer
        );
      }
      
      console.log('[PROOF-SUBMIT] ✅ Proof submitted successfully:', {
        transactionDigest: transactionResult.digest
      });
    } catch (err) {
      console.error('[PROOF-SUBMIT] Proof submission error:', err);
      return res.status(500).json({
        error: 'Failed to submit proof to blockchain',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }

    // Return transaction result
    res.json({
      success: true,
      proof_id,
      blob_id,
      transaction_digest: transactionResult.digest,
      transaction_result: {
        effects: transactionResult.effects,
        events: transactionResult.events,
      },
      message: 'Proof submitted and verified on-chain successfully'
    });

  } catch (err) {
    console.error('Submit proof error:', err);
    res.status(500).json({
      error: 'Proof submission failed',
      details: err.message
    });
  }
}

/**
 * Get proof status from blockchain
 * GET /proofs/:proofId/status
 */
export async function getProofStatusController(req, res) {
  try {
    const { proofId } = req.params;

    if (!proofId) {
      return res.status(400).json({
        error: 'proofId is required'
      });
    }

    const suiNetwork = process.env.SUI_NETWORK || 'testnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID;
    const proofVerifierRegistryObjectId = process.env.PROOF_VERIFIER_REGISTRY_OBJECT_ID;
    
    if (!proofVerifierPackageId || !proofVerifierRegistryObjectId) {
      return res.status(500).json({
        error: 'Proof verifier not configured',
        message: 'PROOF_VERIFIER_PACKAGE_ID and PROOF_VERIFIER_REGISTRY_OBJECT_ID must be set in .env'
      });
    }

    const client = getSuiClient(suiNetwork);
    const { queryProofResult } = await import('../utils/sui.mjs');

    // Query proof result from blockchain
    const proofResult = await queryProofResult(
      client,
      proofVerifierPackageId,
      proofVerifierRegistryObjectId,
      proofId
    );

    if (!proofResult || !proofResult.exists) {
      return res.status(404).json({
        error: 'Proof not found',
        proof_id: proofId
      });
    }

    res.json({
      proof_id: proofId,
      status: 'verified',
      exists: true,
      data: proofResult
    });

  } catch (err) {
    console.error('[PROOF-STATUS] Get proof status error:', err);
    res.status(500).json({
      error: 'Failed to get proof status',
      details: err.message
    });
  }
}
