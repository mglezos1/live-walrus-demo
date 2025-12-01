import { execSync } from "child_process";
import fs from "fs";

/**
 * Store a file in Walrus as a blob.
 * @param {string} filePath - path to local file to upload
 * @param {string} walletPath - path to Sui wallet config
 * @returns {string} blobId
 */
export function storeBlob(filePath, walletPath = "/root/.sui/sui_config/client.yaml") {
    const cmd = `walrus store ${filePath} --wallet ${walletPath} --gas-budget 20000000 --epochs 5 --json`;

    const raw = execSync(cmd, { encoding: "utf8" });
    const parsed = JSON.parse(raw);

    const blobId = parsed[0].blobStoreResult.newlyCreated.blobObject.blobId;
    return blobId;
}

/**
 * Read (download) a blob from Walrus
 * @param {string} blobId
 * @param {string} outputPath
 * @param {string} walletPath
 * @returns {string} outputPath
 */
export function readBlob(blobId, outputPath, walletPath = "/root/.sui/sui_config/client.yaml") {
    const cmd = `walrus read ${blobId} --wallet ${walletPath} --out ${outputPath}`;
    execSync(cmd, { stdio: "inherit" });
    return outputPath;
}
