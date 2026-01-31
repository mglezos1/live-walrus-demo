// Proof registry — single source of truth
export const PROOF_TYPES = {
  1: {
    name: "Count under 18 & pregnant",
    endpoint: "/proof/merkle-count",
    circuit: "capability_bound_count_merkle_v2"
  },

  2: {
    name: "Count positive condition (generic)",
    endpoint: "/proof/merkle-count",
    circuit: "capability_bound_count_merkle_v2"
  }

  // Future:
  // 3: average
  // 4: threshold
};
