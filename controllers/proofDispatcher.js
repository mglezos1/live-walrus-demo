import {
  generateJuvenileDiabetesUnder18CountProof,
  generateAgeOver18CountProof
} from "./proveController.js";

export async function dispatchProof({ proofType, blobId }) {
  switch (proofType) {
    case "count_under_18_diabetes":
      return await generateJuvenileDiabetesUnder18CountProof(blobId);

    case "count_over_18":
      return await generateAgeOver18CountProof(blobId);

    default:
      throw new Error(`Proof type not implemented: ${proofType}`);
  }
}

