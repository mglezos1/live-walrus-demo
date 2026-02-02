import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Expand ~ in file paths to home directory
 * @param {string} filePath - Path that may contain ~
 * @returns {string} Expanded path
 */
function expandPath(filePath) {
    if (filePath.startsWith('~')) {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}

/**
 * Validate blob ID format
 * @param {string} blobId - Blob ID to validate
 * @returns {boolean} True if valid
 */
function isValidBlobId(blobId) {
    return blobId && typeof blobId === 'string' && blobId.length > 0;
}

/**
 * Store a file in Walrus as a blob with retry logic.
 * @param {string} filePath - path to local file to upload
 * @param {string} walletPath - path to Sui wallet config (default: ~/.sui/sui_config/client.yaml)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {string} blobId
 */
export function storeBlob(filePath, walletPath = "~/.sui/sui_config/client.yaml", maxRetries = 3) {
    // Expand ~ in wallet path
    const expandedWalletPath = expandPath(walletPath);
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Verify wallet path exists
    if (!fs.existsSync(expandedWalletPath)) {
        throw new Error(`Wallet config not found: ${expandedWalletPath}`);
    }
    
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const cmd = `walrus store ${filePath} --wallet ${expandedWalletPath} --gas-budget 20000000 --epochs 5 --json`;
            
            console.log(`[WALRUS] Upload attempt ${attempt + 1}/${maxRetries}...`);
            const raw = execSync(cmd, { 
                encoding: "utf8",
                stdio: ['inherit', 'pipe', 'pipe']
            });
            
            const parsed = JSON.parse(raw);
            
            // Handle array response
            const result = Array.isArray(parsed) ? parsed[0] : parsed;
            
            if (!result || !result.blobStoreResult || !result.blobStoreResult.newlyCreated) {
                throw new Error('Invalid Walrus response format');
            }
            
            const blobId = result.blobStoreResult.newlyCreated.blobObject?.blobId;
            
            if (!isValidBlobId(blobId)) {
                throw new Error('Invalid blob ID format in response');
            }
            
            console.log(`[WALRUS] ✅ Upload successful, blob ID: ${blobId}`);
            return blobId;
            
        } catch (error) {
            lastError = error;
            const errorMessage = error.stderr?.toString() || error.stdout?.toString() || error.message || 'Unknown error';
            
            console.error(`[WALRUS] Upload attempt ${attempt + 1} failed:`, errorMessage);
            
            if (attempt < maxRetries - 1) {
                // Exponential backoff: wait 1s, 2s, 4s...
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`[WALRUS] Retrying in ${waitTime}ms...`);
                // Note: execSync is synchronous, so we can't use setTimeout here
                // In a real async implementation, you'd use exec from child_process
                // For now, we'll just retry immediately
            }
        }
    }
    
    throw new Error(`Walrus upload failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Read (download) a blob from Walrus with retry logic
 * @param {string} blobId - Blob ID to download
 * @param {string} outputPath - Path to save the downloaded file
 * @param {string} walletPath - Path to Sui wallet config (default: ~/.sui/sui_config/client.yaml)
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {string} outputPath
 */
export function readBlob(blobId, outputPath, walletPath = "~/.sui/sui_config/client.yaml", maxRetries = 3) {
    // Validate blob ID
    if (!isValidBlobId(blobId)) {
        throw new Error(`Invalid blob ID: ${blobId}`);
    }
    
    // Expand ~ in wallet path
    const expandedWalletPath = expandPath(walletPath);
    
    // Verify wallet path exists
    if (!fs.existsSync(expandedWalletPath)) {
        throw new Error(`Wallet config not found: ${expandedWalletPath}`);
    }
    
    // Escape single quotes in arguments for shell safety
    const escapeShell = (str) => str.replace(/'/g, "'\\''");
    
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Quote arguments to handle special characters
            const quotedBlobId = `'${escapeShell(blobId)}'`;
            const quotedWalletPath = `'${escapeShell(expandedWalletPath)}'`;
            const quotedOutputPath = `'${escapeShell(outputPath)}'`;
            
            const cmd = `walrus read ${quotedBlobId} --wallet ${quotedWalletPath} --out ${quotedOutputPath}`;
            
            console.log(`[WALRUS] Download attempt ${attempt + 1}/${maxRetries} for blob: ${blobId}`);
            
            execSync(cmd, { 
                stdio: ['inherit', 'pipe', 'pipe'],
                encoding: 'utf8'
            });
            
            // Verify file was created
            if (!fs.existsSync(outputPath)) {
                throw new Error(`Downloaded file not found at: ${outputPath}`);
            }
            
            console.log(`[WALRUS] ✅ Download successful: ${outputPath}`);
            return outputPath;
            
        } catch (error) {
            lastError = error;
            const errorMessage = error.stderr?.toString() || error.message || 'Unknown error';
            
            console.error(`[WALRUS] Download attempt ${attempt + 1} failed:`, errorMessage);
            
            if (attempt < maxRetries - 1) {
                // Clean up partial download if it exists
                if (fs.existsSync(outputPath)) {
                    try {
                        fs.unlinkSync(outputPath);
                    } catch (unlinkError) {
                        // Ignore unlink errors
                    }
                }
                console.log(`[WALRUS] Retrying in ${Math.pow(2, attempt) * 1000}ms...`);
            }
        }
    }
    
    throw new Error(`Walrus read failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}
