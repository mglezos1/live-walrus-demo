import express from "express";
import multer from "multer";
import fs from "fs";
import { execSync } from "child_process";

const router = express.Router();
const upload = multer({ dest: "/tmp" });

/**
 * POST /upload/dataset
 * Stores PLAINTEXT JSON dataset on Walrus
 */
router.post("/dataset", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;

    // ---- Validate JSON FIRST ----
    let dataset;
    try {
      const text = fs.readFileSync(filePath, "utf8");
      dataset = JSON.parse(text);
    } catch (err) {
      console.error("JSON parse error:", err.message);
      return res.status(400).json({ error: "Uploaded file is not valid JSON" });
    }

    if (!Array.isArray(dataset)) {
      return res.status(400).json({ error: "Dataset must be a JSON array" });
    }

    // ---- Store on Walrus (REQUIRED FLAGS) ----
    const cmd = `/usr/local/bin/walrus store --epochs 10 ${filePath}`;
    console.log("Running:", cmd);

    const output = execSync(cmd, {
      encoding: "utf8",
      stdio: "pipe"
    });

    console.log("Walrus output:\n", output);

    const match = output.match(/Blob ID:\s+([A-Za-z0-9\-_]+)/);
    if (!match) {
      throw new Error("Could not extract blob ID from Walrus output");
    }

    const blobId = match[1];

    res.json({
      status: "stored_and_registered",
      blobId,
      records: dataset.length
    });
  } catch (err) {
    console.error("UPLOAD FAILED:");
    console.error(err.message);
    if (err.stderr) console.error(err.stderr.toString());
    res.status(500).json({ error: "Dataset upload failed" });
  }
});

export default router;
