import { buildPoseidon } from "circomlibjs";

// Encode dataset values (already boolean / numeric)
export function encodeMedicalDataset(values) {
  if (!Array.isArray(values) || values.length !== 10) {
    throw new Error("Dataset must be an array of 10 values");
  }
  return values.map(v => BigInt(v));
}

// Compute Poseidon Merkle root (matches circuit)
export async function computeDatasetRoot(encodedValues) {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // ---- leaf hashes ----
  let leafHashes = encodedValues.map(v =>
    F.toObject(poseidon([v]))
  );

  // ---- level 1 (10 → 5) ----
  let level1 = [];
  for (let i = 0; i < 5; i++) {
    level1.push(
      F.toObject(
        poseidon([leafHashes[2 * i], leafHashes[2 * i + 1]])
      )
    );
  }

  // ---- level 2 (5 → 3) ----
  let level2 = [];
  level2.push(F.toObject(poseidon([level1[0], level1[1]])));
  level2.push(F.toObject(poseidon([level1[2], level1[3]])));
  level2.push(F.toObject(poseidon([level1[4], 0n])));

  // ---- level 3 (3 → 2) ----
  let level3 = [];
  level3.push(F.toObject(poseidon([level2[0], level2[1]])));
  level3.push(F.toObject(poseidon([level2[2], 0n])));

  // ---- root ----
  const root = F.toObject(
    poseidon([level3[0], level3[1]])
  );

  return root.toString();
}
