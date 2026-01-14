import express from "express";
const router = express.Router();

import proofTypeRegistry from "../proofTypeRegistry.js";

// List proof types
router.get("/", (req, res) => {
  res.json(proofTypeRegistry.list());
});

// Create proof type (metadata only)
router.post("/", (req, res) => {
  const { proofType, description } = req.body;

  if (!proofType) {
    return res.status(400).json({ error: "proofType required" });
  }

  try {
    const record = proofTypeRegistry.register({ proofType, description });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

