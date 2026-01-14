const express = require("express");
const router = express.Router();
const proofRegistry = require("../proofRegistry");

/**
 * GET proof by ID (only if active)
 */
router.get("/:id", (req, res) => {
  const record = proofRegistry.get(req.params.id);

  if (!record) {
    return res.status(404).json({ error: "Proof not found" });
  }

  if (!record.active) {
    return res.status(403).json({ error: "Proof access revoked" });
  }

  res.json({
    proofId: record.proofId,
    type: record.type,
    blobId: record.blobId,
    publicSignals: record.publicSignals,
    proof: record.proof,
    metadata: record.metadata,
    createdAt: record.createdAt
  });
});

/**
 * REVOKE proof access
 */
router.post("/:id/revoke", (req, res) => {
  const record = proofRegistry.revoke(req.params.id);

  if (!record) {
    return res.status(404).json({ error: "Proof not found" });
  }

  res.json({
    message: "Proof access revoked",
    proofId: record.proofId
  });
});

module.exports = router;
