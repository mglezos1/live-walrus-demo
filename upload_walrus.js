import { execSync } from "child_process";
import fs from "fs";

async function uploadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  try {
    console.log("⏳ Uploading to Walrus...");

    const output = execSync(
      `walrus store ${filePath} --wallet /root/.sui/sui_config/client.yaml --epochs 5 --gas-budget 20000000 --json`,
      { encoding: "utf8" }
    );

    console.log("CLI Output:\n", output);

    const json = JSON.parse(output);
    const blobId = json[0].blobStoreResult.newlyCreated.blobObject.blobId;

    console.log("\n✅ Upload successful!");
    console.log("Blob ID:", blobId);

  } catch (err) {
    console.error("❌ Upload failed:", err.stderr || err.message);
  }
}

uploadFile("test.txt");
