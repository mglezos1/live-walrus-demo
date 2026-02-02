// routes/verifier.js
import express from "express";
import { getSuiClient, queryProofResult } from "../utils/sui.mjs";

const router = express.Router();

/**
 * GET /verifier/proofs/:proofId
 * Get proof result by proof ID
 */
router.get("/proofs/:proofId", async (req, res) => {
  try {
    const { proofId } = req.params;
    
    const suiNetwork = process.env.SUI_NETWORK || 'devnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID;
    const proofVerifierRegistryObjectId = process.env.PROOF_VERIFIER_REGISTRY_OBJECT_ID;
    
    if (!proofVerifierPackageId || !proofVerifierRegistryObjectId) {
      return res.status(500).json({
        error: 'Proof verifier not configured',
        message: 'PROOF_VERIFIER_PACKAGE_ID and PROOF_VERIFIER_REGISTRY_OBJECT_ID must be set in .env',
        proof_result: null
      });
    }
    
    const client = getSuiClient(suiNetwork);
    
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
        proof_id: proofId,
        proof_result: null
      });
    }
    
    // Format response to match expected format
    res.json({
      proof_result: {
        proof_id: proofId,
        blob_id: proofResult.blob_id || '',
        public_output: proofResult.public_output || '',
        verified_at: proofResult.verified_at || Date.now(),
        verifier_address: proofResult.verifier_address || '',
        circuit_id: proofResult.circuit_id || ''
      }
    });
  } catch (err) {
    console.error('[VERIFIER] Error querying proof:', err);
    res.status(500).json({
      error: "Failed to get proof",
      details: err.message
    });
  }
});

/**
 * GET /verifier/datasets/:blobId/proofs
 * List all proofs for a dataset
 * 
 * Note: This requires maintaining an index of proofs by dataset.
 * For now, this returns an empty array as the Verifier contract
 * doesn't have a direct way to query all proofs for a dataset.
 * In production, you'd maintain this index off-chain or use events.
 */
router.get("/datasets/:blobId/proofs", async (req, res) => {
  try {
    const { blobId } = req.params;
    
    // TODO: Implement dataset proof index query
    // This would require:
    // 1. Maintaining an index mapping blobId -> proofIds
    // 2. Querying the Verifier contract's DatasetProofIndex
    // 3. Or querying events for DatasetRegistered/ProofVerified
    
    console.log('[VERIFIER] Querying proofs for dataset:', blobId);
    
    // For now, return empty array with a note
    res.json({
      proofs: [],
      message: 'Dataset proof listing not yet implemented. Use /verifier/proofs/:proofId to query individual proofs.',
      blob_id: blobId
    });
  } catch (err) {
    console.error('[VERIFIER] Error querying dataset proofs:', err);
    res.status(500).json({
      error: "Failed to get proofs for dataset",
      details: err.message
    });
  }
});

export default router;
