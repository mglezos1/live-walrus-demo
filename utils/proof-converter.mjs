import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Convert snarkjs proof JSON to Arkworks canonical compressed format
 * using the Rust converter tool.
 * 
 * @param {string} proofJsonPath - Path to the snarkjs proof JSON file
 * @returns {Promise<Uint8Array>} Serialized proof bytes
 */
export async function convertProofToSuiBytes(proofJsonPath) {
  const converterPath = path.join(__dirname, '../proof-converter/target/release/proof-converter');
  
  // Use a temporary file for output
  const tmpOutput = `/tmp/proof_${Date.now()}.bin`;
  
  try {
    // Run the Rust converter
    const { stdout, stderr } = await execAsync(
      `${converterPath} "${proofJsonPath}" "${tmpOutput}"`
    );
    
    // Log stderr if it contains warnings/errors, but not the success message
    if (stderr && !stderr.includes('✅')) {
      console.warn('[PROOF-CONVERTER] Warning:', stderr);
    }
    
    // Read the binary output
    const bytes = await readFile(tmpOutput);
    
    // Clean up temp file
    try {
      await execAsync(`rm -f "${tmpOutput}"`);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return new Uint8Array(bytes);
  } catch (error) {
    throw new Error(`Failed to convert proof: ${error.message}`);
  }
}
