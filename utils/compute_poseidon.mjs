import { buildPoseidon } from "circomlibjs";

/**
 * Compute Poseidon hash of a Buffer
 * @param {Buffer} data
 * @returns {Promise<string>} decimal string of Poseidon hash
 */
export async function computePoseidonHash(data) {
    const poseidon = await buildPoseidon();

    // Convert buffer to BigInt field element
    const dataBigInt = BigInt("0x" + data.toString("hex"));

    // Hash: poseidon([input])
    const hash = poseidon.F.toObject(poseidon([dataBigInt]));

    // Convert field element to decimal string
    return hash.toString();
}
