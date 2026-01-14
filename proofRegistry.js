// proofRegistry.js
const crypto = require("crypto");

class ProofRegistry {
  constructor() {
    this.proofs = new Map();
  }

  generateProofId() {
    return "proof_" + crypto.randomBytes(8).toString("hex");
  }

  store({ type, blobId, proof, publicSignals, metadata = {} }) {
    const proofId = this.generateProofId();

    const record = {
      proofId,
      type,
      blobId,
      proof,
      publicSignals,
      metadata,
      active: true,
      createdAt: Date.now()
    };

    this.proofs.set(proofId, record);
    return record;
  }

  get(proofId) {
    return this.proofs.get(proofId);
  }

  revoke(proofId) {
    const record = this.proofs.get(proofId);
    if (!record) return null;

    record.active = false;
    record.revokedAt = Date.now();
    return record;
  }

  list() {
    return Array.from(this.proofs.values());
  }
}

module.exports = new ProofRegistry();
