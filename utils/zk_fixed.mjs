// utils/zk_fixed.mjs
// BigInt-safe ZK helper functions

import * as snarkjs from "snarkjs";
import fs from "fs/promises";

// Convert nested BigInts into strings for JSON
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

// Run Circom witness generator
// -------------------------
// Generate witness (with captured stdout/stderr)
// -------------------------
export async function generateWitness(wasmPath, inputJson, witnessPath) {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
        const proc = spawn("node", [
            "build/covid_result_js/generate_witness.mjs",
            wasmPath,
            inputJson,
            witnessPath
        ]);

        let stderr = "";
        let stdout = "";

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
                reject(new Error(
                    `Witness generation failed.\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
                ));
            }
        });
    });
}


// Generate Groth16 proof
export async function generateProof(zkeyPath, witnessPath) {
    const proofData = await snarkjs.groth16.prove(zkeyPath, witnessPath);

    return {
        proof: stringifyBigInts(proofData.proof),
        publicSignals: stringifyBigInts(proofData.publicSignals)
    };
}

// Verify Groth16 proof
export async function verifyProof(vkeyPath, publicJsonPath, proof) {
    const vkey = JSON.parse(await fs.readFile(vkeyPath));
    const publicSignals = JSON.parse(await fs.readFile(publicJsonPath));

    return snarkjs.groth16.verify(vkey, publicSignals, proof);
}
