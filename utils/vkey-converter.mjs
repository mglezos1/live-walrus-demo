import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

/**
 * Convert .zkey file (using ark-circom) or snarkjs verification key JSON to Arkworks canonical format
 * using the Rust converter tool
 * 
 * @param {string} vkeyPath - Path to the .zkey file or snarkjs verification key JSON file
 * @returns {Promise<Uint8Array>} Serialized verification key bytes in Arkworks canonical format
 */
export async function convertVkeyToSuiBytes(vkeyPath, useUncompressed = false) {
  const converterPath = path.join(__dirname, '../vkey-converter/target/release/vkey-converter');
  
  // Use JSON file directly (.zkey support is disabled due to Rust compiler issues)
  // If a .zkey path is provided, convert it to the corresponding JSON path
  let inputPath = vkeyPath;
  if (vkeyPath.endsWith('.zkey')) {
    inputPath = vkeyPath.replace('.zkey', '_vkey.json');
    console.log(`[VKEY-CONVERTER] .zkey files not supported, using JSON instead: ${inputPath}`);
  }
  
  console.log(`[VKEY-CONVERTER] Converting verification key from: ${inputPath}`);
  
  // Use a temporary file for output
  const tmpOutput = `/tmp/vkey_${Date.now()}.bin`;
  
  try {
    // Run the Rust converter (uses ark-circom for .zkey, manual parsing for .json)
    const { stdout, stderr } = await execAsync(
      `${converterPath} "${inputPath}" "${tmpOutput}"`
    );
    
    if (stderr && !stderr.includes('✅')) {
      console.warn('[VKEY-CONVERTER] Warning:', stderr);
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
    throw new Error(`Failed to convert verification key: ${error.message}`);
  }
}

/**
 * Convert snarkjs verification key JSON object to Arkworks canonical compressed format
 * 
 * @param {Object} vkeyJson - Verification key JSON object from snarkjs
 * @returns {Promise<Uint8Array>} Serialized verification key bytes
 */
export async function convertVkeyJsonToSuiBytes(vkeyJson) {
  const tmpJsonPath = `/tmp/vkey_json_${Date.now()}.json`;
  const { writeFile } = await import('fs/promises');
  
  try {
    // Write JSON to temp file
    await writeFile(tmpJsonPath, JSON.stringify(vkeyJson, null, 2));
    
    // Convert using the Rust tool
    const bytes = await convertVkeyToSuiBytes(tmpJsonPath);
    
    // Clean up temp file
    try {
      await execAsync(`rm -f "${tmpJsonPath}"`);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return bytes;
  } catch (error) {
    // Clean up temp file on error
    try {
      await execAsync(`rm -f "${tmpJsonPath}"`);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
}
