import express from "express";
import crypto from "crypto";
import {
  registerDataset,
  listDatasets
} from "../datasetRegistry.js";

const router = express.Router();

/*
  POST /datasets/upload

  Body:
  {
    datasetId: string,
    values: number[]   // length 10
  }
*/
router.post("/upload", (req, res) => {
  const { datasetId, values } = req.body;

  if (typeof datasetId !== "string" || !Array.isArray(values)) {
    return res.status(400).json({
      error: "datasetId and values array required"
    });
  }

  if (values.length !== 10) {
    return res.status(400).json({
      error: "Dataset must contain exactly 10 values"
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

  // Simple commitment (sum)
  const datasetRoot = values.reduce((a, b) => a + b, 0);

  const dataset = registerDataset({
    datasetId,
    datasetIdHash,
    values,
    datasetRoot
  });

  res.json({
    datasetId: dataset.datasetId,
    datasetIdHash: dataset.datasetIdHash,
    datasetRoot: dataset.datasetRoot
  });
});

/*
  GET /datasets
  Debug / inspection endpoint
*/
router.get("/", (req, res) => {
  res.json(listDatasets());
});

export default router;
