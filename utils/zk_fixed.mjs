// utils/zk_fixed.mjs
// BigInt-safe ZK helper functions (ESM)

import * as snarkjs from "snarkjs";
import fs from "fs/promises";
import { spawn } from "child_process";
import path from "path";

/**
 * Convert nested BigInts into strings so they can be JSON-serialized
 */
function stringifyBigInts(obj) {
    if (typeof obj === "bigint") return obj.toString();
    if (Array.isArray(obj)) return obj.map(stringifyBigInts);
    if (typeof obj === "object" && obj !== null) {
        const out = {};
        for (const k in obj) out[k] = stringifyBigInts(obj[k]);
        return out;
    }
    return obj;
}

/**
 * Generate a Circom witness
 *
 * @param {string} wasmPath - path to circuit .wasm file
 * @param {string} inputJsonPath - path to input JSON
 * @param {string} witnessPath - output witness path
 */
export async function generateWitness(wasmPath, inputJsonPath, witnessPath) {
    // Example wasmPath:
    // circuits/juvenile_diabetes_under_18_count_10_js/juvenile_diabetes_under_18_count_10.wasm

    const wasmDir = path.dirname(wasmPath);
    const generatorPath = path.join(wasmDir, "generate_witness.cjs");

    return new Promise((resolve, reject) => {
        const proc = spawn("node", [
            generatorPath,
            wasmPath,
            inputJsonPath,
            witnessPath
        ]);

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve(true);
            } else {
                reject(
                    new Error(
                        `Witness generation failed.\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
                    )
                );
            }
        });
    });
}

/**
 * Generate a Groth16 proof
 *
 * @param {string} zkeyPath - path to .zkey
 * @param {string} witnessPath - path to witness
 */
export async function generateProof(zkeyPath, witnessPath) {
    const proofData = await snarkjs.groth16.prove(zkeyPath, witnessPath);

    return {
        proof: stringifyBigInts(proofData.proof),
        publicSignals: stringifyBigInts(proofData.publicSignals)
    };
}

/**
 * Verify a Groth16 proof
 *
 * @param {string} vkeyPath - verification key JSON
 * @param {string} publicJsonPath - public signals JSON
 * @param {object} proof - proof object
 */
export async function verifyProof(vkeyPath, publicJsonPath, proof) {
    const vkey = JSON.parse(await fs.readFile(vkeyPath));
    const publicSignals = JSON.parse(await fs.readFile(publicJsonPath));

    return snarkjs.groth16.verify(vkey, publicSignals, proof);
}
