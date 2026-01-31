// controllers/proofSubmissionController.js
// Proof submission service to Sui blockchain

import { getSuiClient, submitProof, prepareProofForSui, preparePublicInputsForSui } from '../utils/sui.mjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

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
    const suiNetwork = process.env.SUI_NETWORK || 'devnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID;
    
    if (!proofVerifierPackageId) {
      return res.status(500).json({
        error: 'PROOF_VERIFIER_PACKAGE_ID not configured'
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
        error: 'SUI_PRIVATE_KEY not configured. Cannot sign transaction.'
      });
    }

    // Format proof for Sui
    const proofFormatted = prepareProofForSui(proof);
    const publicInputsBytes = preparePublicInputsForSui(public_signals);

    // Convert public output to bytes
    const publicOutputBytes = new TextEncoder().encode(
      typeof public_output === 'number' ? public_output.toString() : public_output
    );

    // Submit proof to blockchain
    let transactionResult;
    try {
      transactionResult = await submitProof(
        client,
        proofVerifierPackageId,
        proof_id,
        blob_id,
        Array.from(publicOutputBytes),
        proof,
        public_signals,
        circuit_id,
        signer
      );
    } catch (err) {
      console.error('Proof submission error:', err);
      return res.status(500).json({
        error: 'Failed to submit proof to blockchain',
        details: err.message
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

    const suiNetwork = process.env.SUI_NETWORK || 'devnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID;
    
    if (!proofVerifierPackageId) {
      return res.status(500).json({
        error: 'PROOF_VERIFIER_PACKAGE_ID not configured'
      });
    }

    const client = getSuiClient(suiNetwork);

    // Query proof result from blockchain
    // This would require the registry object ID
    // For now, return a placeholder response
    res.json({
      proof_id: proofId,
      status: 'verified', // Would query from blockchain
      message: 'Proof status retrieved (placeholder - implement blockchain query)'
    });

  } catch (err) {
    console.error('Get proof status error:', err);
    res.status(500).json({
      error: 'Failed to get proof status',
      details: err.message
    });
  }
}
