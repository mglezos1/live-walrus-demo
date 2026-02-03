// routes/verifier.js
import express from "express";
import { getSuiClient, queryProofResult, queryProofsByBlobId, checkTransactionStatus, queryRegisteredVerifyingKeys } from "../utils/sui.mjs";

const router = express.Router();

/**
 * GET /verifier/proofs/:proofId
 * Get proof result by proof ID
 */
router.get("/proofs/:proofId", async (req, res) => {
  try {
    const { proofId } = req.params;
    
    const suiNetwork = process.env.SUI_NETWORK || 'testnet';
    // Try both PROOF_VERIFIER and VERIFIER env vars for compatibility
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID || process.env.VERIFIER_PACKAGE_ID;
    const proofVerifierRegistryObjectId = process.env.PROOF_VERIFIER_REGISTRY_OBJECT_ID || process.env.VERIFIER_OBJECT_ID;
    
    if (!proofVerifierPackageId || !proofVerifierRegistryObjectId) {
      return res.status(500).json({
        error: 'Proof verifier not configured',
        message: 'PROOF_VERIFIER_PACKAGE_ID and PROOF_VERIFIER_REGISTRY_OBJECT_ID (or VERIFIER_PACKAGE_ID and VERIFIER_OBJECT_ID) must be set in .env',
        proof_result: null,
        help: 'These values should be set after deploying the Verifier Move contract to Sui testnet'
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
 * List all proofs for a dataset by querying ProofVerified events
 */
router.get("/datasets/:blobId/proofs", async (req, res) => {
  try {
    const { blobId } = req.params;
    
    const suiNetwork = process.env.SUI_NETWORK || 'testnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID || process.env.VERIFIER_PACKAGE_ID;
    
    if (!proofVerifierPackageId) {
      return res.status(500).json({
        error: 'Proof verifier not configured',
        message: 'PROOF_VERIFIER_PACKAGE_ID (or VERIFIER_PACKAGE_ID) must be set in .env',
        proofs: [],
        blob_id: blobId
      });
    }
    
    console.log('[VERIFIER] Querying proofs for dataset:', blobId);
    
    const client = getSuiClient(suiNetwork);
    
    // Query proofs by blob_id using events
    const proofs = await queryProofsByBlobId(
      client,
      proofVerifierPackageId,
      blobId
    );
    
    res.json({
      proofs: proofs,
      blob_id: blobId,
      count: proofs.length,
      message: proofs.length === 0 
        ? 'No proofs found for this dataset. Proofs will appear here after they are generated and submitted to the blockchain.'
        : `Found ${proofs.length} proof(s) for this dataset.`
    });
  } catch (err) {
    console.error('[VERIFIER] Error querying dataset proofs:', err);
    res.status(500).json({
      error: "Failed to get proofs for dataset",
      details: err.message,
      proofs: []
    });
  }
});

/**
 * GET /verifier/transactions/:digest/check
 * Check transaction status and events
 */
router.get("/transactions/:digest/check", async (req, res) => {
  try {
    const { digest } = req.params;
    const suiNetwork = process.env.SUI_NETWORK || 'testnet';
    const client = getSuiClient(suiNetwork);
    
    const tx = await checkTransactionStatus(client, digest);
    
    res.json({
      digest,
      status: tx.effects?.status,
      events: tx.events || [],
      eventCount: tx.events?.length || 0,
      effects: tx.effects,
    });
  } catch (err) {
    console.error('[VERIFIER] Error checking transaction:', err);
    res.status(500).json({
      error: "Failed to check transaction",
      details: err.message
    });
  }
});

/**
 * GET /verifier/verifying-keys
 * List all registered verifying keys
 */
router.get("/verifying-keys", async (req, res) => {
  try {
    const suiNetwork = process.env.SUI_NETWORK || 'testnet';
    const proofVerifierPackageId = process.env.PROOF_VERIFIER_PACKAGE_ID || process.env.VERIFIER_PACKAGE_ID;
    
    if (!proofVerifierPackageId) {
      return res.status(500).json({
        error: 'Proof verifier not configured',
        message: 'PROOF_VERIFIER_PACKAGE_ID must be set in .env',
        keys: []
      });
    }
    
    const client = getSuiClient(suiNetwork);
    const keys = await queryRegisteredVerifyingKeys(client, proofVerifierPackageId);
    
    res.json({
      keys: keys,
      count: keys.length,
      packageId: proofVerifierPackageId
    });
  } catch (err) {
    console.error('[VERIFIER] Error querying verifying keys:', err);
    res.status(500).json({
      error: "Failed to query verifying keys",
      details: err.message,
      keys: []
    });
  }
});

export default router;
