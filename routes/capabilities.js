import express from "express";
import crypto from "crypto";

import capabilityRegistry from "../capabilityRegistry.js";
import { dispatchProof } from "../controllers/proofDispatcher.js";

const router = express.Router();

// -----------------------------
// CREATE CAPABILITY
// -----------------------------
router.post("/", (req, res) => {
  const { blobId, proofType } = req.body;

  if (!blobId || !proofType) {
    return res.status(400).json({
      error: "blobId and proofType required"
    });
  }

  const capabilityId = "cap_" + crypto.randomBytes(8).toString("hex");

  capabilityRegistry.create({
    capabilityId,
    blobId,
    proofType
  });

  res.json({
    capabilityId,
    proofType
  });
});

// -----------------------------
// GENERATE PROOF (ON DEMAND)
// -----------------------------
router.post("/:id/prove", async (req, res) => {
  const capability = capabilityRegistry.get(req.params.id);

  if (!capability) {
    return res.status(404).json({ error: "Capability not found" });
  }

  if (!capability.active) {
    return res.status(403).json({ error: "Capability revoked" });
  }

  try {
    const result = await dispatchProof({
      proofType: capability.proofType,
      blobId: capability.blobId
    });

    res.json({
      capabilityId: capability.capabilityId,
      proofType: capability.proofType,
      blobId: capability.blobId,
      ...result
    });
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});

// -----------------------------
// REVOKE CAPABILITY
// -----------------------------
router.post("/:id/revoke", (req, res) => {
  const capability = capabilityRegistry.get(req.params.id);

  if (!capability) {
    return res.status(404).json({ error: "Capability not found" });
  }

  capability.active = false;

  res.json({
    capabilityId: capability.capabilityId,
    revoked: true
  });
});

// -----------------------------
// LIST ALL CAPABILITIES (OPTIONAL)
// -----------------------------
router.get("/", (req, res) => {
  res.json(capabilityRegistry.list());
});

export default router;
