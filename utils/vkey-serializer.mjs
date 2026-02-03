/**
 * Convert snarkjs verification key JSON to Sui-compatible bytes format
 * Sui expects the verification key in a specific binary format for BN254 curve
 * 
 * Format: Concatenated serialized group elements
 * - vk_alpha_1 (G1): 64 bytes (x: 32 bytes, y: 32 bytes)
 * - vk_beta_2 (G2): 128 bytes (x: 64 bytes, y: 64 bytes)
 * - vk_gamma_2 (G2): 128 bytes (x: 64 bytes, y: 64 bytes)
 * - vk_delta_2 (G2): 128 bytes (x: 64 bytes, y: 64 bytes)
 * - IC[0] (G1): 64 bytes (x: 32 bytes, y: 32 bytes)
 * - IC[1..n] (G1): 64 bytes each
 */

/**
 * Convert a BigInt string to a 32-byte big-endian Uint8Array
 * Sui/Arkworks typically uses big-endian format
 * @param {string} bigIntStr - BigInt as string
 * @returns {Uint8Array} 32-byte array
 */
function bigIntToBytes32(bigIntStr) {
  const bigInt = BigInt(bigIntStr);
  const bytes = new Uint8Array(32);
  
  // Convert to big-endian bytes
  let value = bigInt;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xFFn);
    value = value >> 8n;
  }
  
  return bytes;
}

/**
 * Convert a BigInt string to a 64-byte little-endian Uint8Array (for G2)
 * @param {string[]} bigIntPair - Array of 2 BigInt strings [x, y]
 * @returns {Uint8Array} 64-byte array (x: 32 bytes, y: 32 bytes)
 */
function bigIntPairToBytes64(bigIntPair) {
  const xBytes = bigIntToBytes32(bigIntPair[0]);
  const yBytes = bigIntToBytes32(bigIntPair[1]);
  const result = new Uint8Array(64);
  result.set(xBytes, 0);
  result.set(yBytes, 32);
  return result;
}

/**
 * Serialize G1 point (array of 3 BigInt strings, but we use first 2)
 * @param {string[]} g1Point - G1 point [x, y, z] where z is usually "1"
 * @returns {Uint8Array} 64-byte array
 */
function serializeG1(g1Point) {
  // G1 points are [x, y, z] but we only serialize x and y
  return bigIntPairToBytes64([g1Point[0], g1Point[1]]);
}

/**
 * Serialize G2 point (array of 3 arrays, each with 2 BigInt strings)
 * @param {string[][]} g2Point - G2 point [[x0, x1], [y0, y1], [z0, z1]]
 * @returns {Uint8Array} 128-byte array
 */
function serializeG2(g2Point) {
  // G2 points are [[x0, x1], [y0, y1], [z0, z1]]
  // We serialize x and y, each as 64 bytes (x0: 32 bytes, x1: 32 bytes)
  const xBytes = bigIntPairToBytes64(g2Point[0]);
  const yBytes = bigIntPairToBytes64(g2Point[1]);
  const result = new Uint8Array(128);
  result.set(xBytes, 0);
  result.set(yBytes, 64);
  return result;
}

/**
 * Convert snarkjs verification key JSON to Sui-compatible bytes
 * @param {Object} vkeyJson - Verification key JSON from snarkjs
 * @returns {Uint8Array} Serialized verification key bytes
 */
export function convertVkeyToSuiBytes(vkeyJson) {
  const { vk_alpha_1, vk_beta_2, vk_gamma_2, vk_delta_2, IC } = vkeyJson;
  
  // Serialize each component
  const alphaBytes = serializeG1(vk_alpha_1);        // 64 bytes
  const betaBytes = serializeG2(vk_beta_2);          // 128 bytes
  const gammaBytes = serializeG2(vk_gamma_2);         // 128 bytes
  const deltaBytes = serializeG2(vk_delta_2);         // 128 bytes
  
  // Serialize IC array (all G1 points)
  const icBytesArray = IC.map(point => serializeG1(point)); // Each 64 bytes
  const totalIcBytes = icBytesArray.reduce((sum, bytes) => sum + bytes.length, 0);
  
  // Calculate total size
  const totalSize = alphaBytes.length + betaBytes.length + gammaBytes.length + 
                    deltaBytes.length + totalIcBytes;
  
  // Concatenate all bytes
  const result = new Uint8Array(totalSize);
  let offset = 0;
  
  result.set(alphaBytes, offset);
  offset += alphaBytes.length;
  
  result.set(betaBytes, offset);
  offset += betaBytes.length;
  
  result.set(gammaBytes, offset);
  offset += gammaBytes.length;
  
  result.set(deltaBytes, offset);
  offset += deltaBytes.length;
  
  // Add all IC points
  for (const icBytes of icBytesArray) {
    result.set(icBytes, offset);
    offset += icBytes.length;
  }
  
  return result;
}
