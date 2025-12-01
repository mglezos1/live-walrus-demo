// controllers/uploadController.js
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import { hashFile } from "../utils/hash.mjs";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function uploadController(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;

    // Step 1️⃣ Hash file
    const fileHash = await hashFile(filePath);

    // Step 2️⃣ Store file on Walrus (valid syntax for your CLI)
    // The "--epochs 5" flag means keep the blob for 5 epochs (adjustable)
    const cmd = `walrus store --epochs 5 ${filePath} --wallet ~/.sui/sui_config/client.yaml --json`;

    const { stdout, stderr } = await execAsync(cmd);

    if (stderr && stderr.trim()) {
      console.error("Walrus CLI stderr:", stderr);
    }

    let walrusOutput;
    try {
      walrusOutput = JSON.parse(stdout);
    } catch {
      walrusOutput = { rawOutput: stdout.trim() };
    }

    return res.json({
      message: "File uploaded and stored successfully on Walrus",
      fileHash,
      walrusOutput,
    });

  } catch (err) {
    console.error("uploadController error:", err);
    return res.status(500).json({ error: err.message });
  }
}
