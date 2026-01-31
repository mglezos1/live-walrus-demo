import express from "express";
import crypto from "crypto";
import { issueCapability, listCapabilities } from "../capabilityRegistry.js";

const router = express.Router();

/*
  POST /capabilities/issue

  Body:
  {
    datasetId: string,
    fieldIndex: number,
    expectedValue: number
  }
*/
router.post("/issue", (req, res) => {
  const { datasetId, fieldIndex, expectedValue } = req.body;

  if (
    typeof datasetId !== "string" ||
    typeof fieldIndex !== "number" ||
    typeof expectedValue !== "number"
  ) {
    return res.status(400).json({
      error: "datasetId, fieldIndex, and expectedValue required"
    });
  }

  const datasetIdHash = parseInt(
    crypto
      .createHash("sha256")
      .update(datasetId)
      .digest("hex")
      .slice(0, 8),
    16
  );

  const cap = issueCapability({
    datasetIdHash,
    fieldIndex,
    expectedValue
  });

  res.json(cap);
});

/*
  GET /capabilities
*/
router.get("/", (req, res) => {
  res.json(listCapabilities());
});

export default router;

