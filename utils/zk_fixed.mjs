// utils/zk_fixed.mjs
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const execFileAsync = promisify(execFile);

// --------------------------------------------------
// Generate witness using generate_witness.cjs
// --------------------------------------------------
export async function generateWitness(wasmPath, inputPath, witnessPath) {
  const dir = path.dirname(wasmPath);
  const generator = path.join(dir, "generate_witness.cjs");

  if (!fs.existsSync(generator)) {
    throw new Error(`generate_witness.cjs not found in ${dir}`);
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  await execFileAsync(
    "node",
    [generator, inputPath, witnessPath],
    { cwd: dir }
  );
}

// --------------------------------------------------
// Generate Groth16 proof (ESM-safe)
// --------------------------------------------------
export async function generateProof(zkeyPath, witnessPath) {
  if (!fs.existsSync(zkeyPath)) {
    throw new Error(`zkey not found: ${zkeyPath}`);
  }

  if (!fs.existsSync(witnessPath)) {
    throw new Error(`witness not found: ${witnessPath}`);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn("snarkjs", [
      "groth16",
      "prove",
      zkeyPath,
      witnessPath,
      "proof.json",
      "public.json"
    ]);

    proc.on("error", reject);

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`snarkjs exited with code ${code}`));
        return;
      }

      try {
        const proof = JSON.parse(fs.readFileSync("proof.json", "utf8"));
        const publicSignals = JSON.parse(fs.readFileSync("public.json", "utf8"));
        resolve({ proof, publicSignals });
      } catch (err) {
        reject(err);
      }
    });
  });
}

