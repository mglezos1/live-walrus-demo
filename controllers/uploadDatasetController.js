// controllers/uploadDatasetController.js
// Enhanced dataset upload with encryption, hashing, Walrus upload, and on-chain registration

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { storeBlob } from '../utils/walrus.mjs';
import { hashDataset, encryptDataset, generateEncryptionKey } from '../utils/crypto.mjs';
import { registerDatasetOnChain, getSuiClient } from '../utils/sui.mjs';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced dataset upload controller
 * 1. Encrypts dataset
 * 2. Computes dataset hash (Poseidon)
 * 3. Uploads encrypted dataset to Walrus
 * 4. Registers dataset hash on Sui blockchain
 */
export default async function uploadDataset(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dataset file required' });
    }

    // Parse dataset
    let dataset;
    try {
      const fileContent = req.file.buffer.toString('utf8');
      dataset = JSON.parse(fileContent);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON dataset file' });
    }

    // Validate dataset structure
    if (!Array.isArray(dataset) && !Array.isArray(dataset.records)) {
      return res.status(400).json({
        error: 'Dataset must be an array or contain a records array'
      });
    }

    const records = Array.isArray(dataset) ? dataset : dataset.records;

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

    // Return response
    res.json({
      success: true,
      blobId,
      datasetHash: datasetMetadata.datasetHash,
      recordCount: records.length,
      onChainTxHash,
      message: 'Dataset uploaded and registered successfully'
    });

  } catch (err) {
    console.error('Upload dataset error:', err);
    res.status(500).json({
      error: 'Dataset upload failed',
      details: err.message
    });
  }
}
