// routes/uploadDataset.js
import express from "express";
import multer from "multer";
import { execSync } from "child_process";
import fs from "fs";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * Upload dataset to Walrus
 * Returns: { blobId }
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;

    // Store on Walrus (10 epochs for demo)
    const output = execSync(
      `/usr/local/bin/walrus store --epochs 10 ${filePath}`,
      { encoding: "utf-8" }
    );

    // Extract blob ID from Walrus output
    const match = output.match(/Blob ID:\s*([^\s]+)/);

    if (!match) {
      throw new Error("Could not extract blobId from Walrus output");
    }

    const blobId = match[1];

    // Cleanup temp file
    fs.unlinkSync(filePath);

    return res.json({ blobId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Upload failed",
      details: err.message
    });
  }
});

export default router;
