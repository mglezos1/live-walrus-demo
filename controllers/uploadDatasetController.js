// controllers/uploadDatasetController.js
// Enhanced dataset upload with encryption, hashing, Walrus upload, and on-chain registration

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { storeBlob } from '../utils/walrus.mjs';
import { hashDataset, encryptDataset, generateEncryptionKey } from '../utils/crypto.mjs';
import { registerDatasetOnChain, getSuiClient } from '../utils/sui.mjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEBUG_LOG_PATH = path.join(__dirname, '../.cursor/debug.log');

// Helper function to write debug logs
async function debugLog(location, message, data, hypothesisId) {
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location,
    message,
    data,
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId
  };
  // Console fallback for immediate visibility
  console.log(`[DEBUG] ${location}: ${message}`, JSON.stringify(data, null, 2));
  try {
    // Ensure .cursor directory exists
    const logDir = path.dirname(DEBUG_LOG_PATH);
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(DEBUG_LOG_PATH, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.error('Debug log write failed:', err.message, err.stack);
  }
}

/**
 * Enhanced dataset upload controller
 * 1. Encrypts dataset
 * 2. Computes dataset hash (Poseidon)
 * 3. Uploads encrypted dataset to Walrus
 * 4. Registers dataset hash on Sui blockchain
 */
export default async function uploadDataset(req, res) {
  // Version marker to verify new code is loaded
  console.log('[UPLOAD-CONTROLLER] Version 2.0 - File upload handler loaded');
  
  // Early return if no file
  if (!req.file) {
    console.log('[UPLOAD-CONTROLLER] No file in req.file');
    return res.status(400).json({ 
      error: 'Dataset file required', 
      details: 'No file received',
      version: '2.0'
    });
  }
  
  console.log('[UPLOAD-CONTROLLER] File received:', req.file.originalname, 'Size:', req.file.size);
  
  try {

    // Parse dataset from file path (multer saves to disk with dest option)
    let dataset;
    let fileContent;
    const uploadedFilePath = req.file.path; // Store for cleanup
    
    try {
      console.log('[UPLOAD-CONTROLLER] Reading file from:', req.file.path);
      console.log('[UPLOAD-CONTROLLER] File extension:', path.extname(req.file.originalname).toLowerCase());
      
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const isExcelFile = ['.xlsx', '.xls'].includes(fileExtension);
      
      if (isExcelFile) {
        // Parse Excel file (read as binary buffer)
        console.log('[UPLOAD-CONTROLLER] Detected Excel file, parsing...');
        const fileBuffer = await fs.readFile(req.file.path);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        console.log('[UPLOAD-CONTROLLER] Reading worksheet:', sheetName);
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON array (objects with column headers as keys)
        dataset = XLSX.utils.sheet_to_json(worksheet, {
          defval: null, // Use null for empty cells instead of undefined
          raw: true // Keep raw values (numbers as numbers, not strings)
        });
        
        // Normalize numeric fields - convert string numbers to actual numbers
        dataset = dataset.map(record => {
          const normalized = {};
          for (const [key, value] of Object.entries(record)) {
            // Try to convert numeric strings to numbers
            if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
              const num = Number(value);
              if (!isNaN(num)) {
                normalized[key] = num;
              } else {
                normalized[key] = value;
              }
            } else {
              normalized[key] = value;
            }
          }
          return normalized;
        });
        
        console.log('[UPLOAD-CONTROLLER] Excel parsed successfully, rows:', dataset.length);
        if (dataset.length > 0) {
          console.log('[UPLOAD-CONTROLLER] Column headers:', Object.keys(dataset[0]));
          console.log('[UPLOAD-CONTROLLER] First row sample:', dataset[0]);
          console.log('[UPLOAD-CONTROLLER] First row types:', Object.fromEntries(
            Object.entries(dataset[0]).map(([k, v]) => [k, typeof v])
          ));
        }
      } else {
        // Parse JSON file (backward compatibility)
        fileContent = await fs.readFile(req.file.path, 'utf8');
        console.log('[UPLOAD-CONTROLLER] File read, length:', fileContent.length);
        
        if (!fileContent || fileContent.trim().length === 0) {
          throw new Error('File is empty');
        }
        
        // Remove BOM if present
        if (fileContent.charCodeAt(0) === 0xFEFF) {
          fileContent = fileContent.slice(1);
        }
        
        // Trim and parse
        fileContent = fileContent.trim();
        console.log('[UPLOAD-CONTROLLER] After trim, length:', fileContent.length);
        console.log('[UPLOAD-CONTROLLER] First 50 chars:', fileContent.substring(0, 50));
        
        // Parse JSON
        dataset = JSON.parse(fileContent);
        console.log('[UPLOAD-CONTROLLER] JSON parsed successfully, type:', typeof dataset, 'isArray:', Array.isArray(dataset));
      }
      
    } catch (err) {
      // Clean up file on error
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[UPLOAD-CONTROLLER] ERROR:', errorMessage);
      console.error('[UPLOAD-CONTROLLER] Error stack:', err.stack);
      
      // Always include details in error response
      const fileExtension = req.file?.originalname ? path.extname(req.file.originalname).toLowerCase() : '';
      const isExcelFile = ['.xlsx', '.xls'].includes(fileExtension);
      const errorResponse = { 
        error: isExcelFile ? 'Invalid Excel dataset file' : 'Invalid JSON dataset file', 
        details: errorMessage,
        filePath: req.file?.path,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        fileType: isExcelFile ? 'Excel' : 'JSON'
      };
      
      console.log('[UPLOAD-CONTROLLER] Sending error response:', JSON.stringify(errorResponse, null, 2));
      return res.status(400).json(errorResponse);
    }

    // Clean up the uploaded file after successful read
    if (req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    // Validate dataset structure - accept array or object with records
    let records;
    if (Array.isArray(dataset)) {
      records = dataset;
    } else if (dataset && Array.isArray(dataset.records)) {
      records = dataset.records;
    } else {
      // Clean up file
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({
        error: 'Dataset must be an array or an object with a records array',
        details: `Received: ${typeof dataset}. Expected: array or {records: array}`
      });
    }
    
    // Ensure records is not empty
    if (!records || records.length === 0) {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({
        error: 'Dataset is empty',
        details: 'Dataset must contain at least one record'
      });
    }

    // Step 1: Encrypt dataset
    const encryptionKey = generateEncryptionKey();
    const encrypted = encryptDataset(records, encryptionKey);

    // Save encrypted dataset to temporary file
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const tempEncryptedPath = path.join(uploadsDir, `encrypted_${Date.now()}.bin`);
    const encryptedBuffer = Buffer.concat([
      encrypted.encrypted,
      encrypted.authTag,
      encrypted.iv
    ]);
    await fs.writeFile(tempEncryptedPath, encryptedBuffer);

    // Step 2: Compute dataset hash (Poseidon)
    const datasetHash = await hashDataset(records);

    // Step 3: Upload encrypted dataset to Walrus
    const walletPath = process.env.SUI_WALLET_PATH || '~/.sui/sui_config/client.yaml';
    let blobId;
    try {
      blobId = await storeBlob(tempEncryptedPath, walletPath);
    } catch (err) {
      // Clean up temp file
      await fs.unlink(tempEncryptedPath).catch(() => {});
      throw new Error(`Walrus upload failed: ${err.message}`);
    }

    // Clean up temp file
    await fs.unlink(tempEncryptedPath).catch(() => {});

    // Step 4: Register dataset hash on Sui blockchain
    const suiNetwork = process.env.SUI_NETWORK || 'devnet';
    const datasetRegistryPackageId = process.env.DATASET_REGISTRY_PACKAGE_ID;
    
    let onChainTxHash = null;
    if (datasetRegistryPackageId) {
      try {
        const client = getSuiClient(suiNetwork);
        
        // Load signer from wallet or environment
        // For now, we'll skip on-chain registration if no package ID is configured
        // In production, you'd load the keypair from wallet
        // const keypair = Ed25519Keypair.deriveKeypair(process.env.SUI_PRIVATE_KEY);
        
        // Uncomment when ready to register on-chain:
        // const result = await registerDatasetOnChain(
        //   client,
        //   datasetRegistryPackageId,
        //   blobId,
        //   datasetHash,
        //   keypair
        // );
        // onChainTxHash = result.digest;
      } catch (err) {
        console.error('On-chain registration failed:', err);
        // Continue even if on-chain registration fails
      }
    }

    // Store encryption key metadata (in production, encrypt this with owner's public key)
    const datasetMetadata = {
      blobId,
      datasetHash: Array.from(datasetHash).map(b => b.toString(16).padStart(2, '0')).join(''),
      encryptionKey: encryptionKey.toString('hex'), // In production, encrypt this
      iv: encrypted.iv.toString('hex'),
      authTag: encrypted.authTag.toString('hex'),
      recordCount: records.length,
      uploadedAt: new Date().toISOString(),
      onChainTxHash,
    };

    // Save metadata (in production, store in database)
    const metadataPath = path.join(uploadsDir, `${blobId}_metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(datasetMetadata, null, 2));

    // Return response (matching frontend type)
    res.json({
      blobId,
      datasetHash: datasetMetadata.datasetHash,
      recordCount: records.length
    });

  } catch (err) {
    // #region agent log
    await debugLog('uploadDatasetController.js:134', 'Top-level catch error', {error:err.message,name:err.name,stack:err.stack?.split('\n').slice(0,3).join('|')}, 'F');
    // #endregion
    console.error('[UPLOAD] ========== TOP-LEVEL ERROR ==========');
    console.error('[UPLOAD] Error:', err);
    console.error('[UPLOAD] Error message:', err instanceof Error ? err.message : String(err));
    console.error('[UPLOAD] Error stack:', err instanceof Error ? err.stack : 'No stack');
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    return res.status(500).json({
      error: 'Dataset upload failed',
      details: err instanceof Error ? err.message : String(err),
      type: err instanceof Error ? err.name : typeof err
    });
  }
}
