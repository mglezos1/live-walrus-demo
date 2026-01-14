// proofTypeRegistry.js

const proofTypes = {};

/**
 * Register a new proof type
 */
function register({ proofType, description }) {
  if (proofTypes[proofType]) {
    throw new Error("Proof type already exists");
  }

  proofTypes[proofType] = {
    proofType,
    description,
    createdAt: Date.now()
  };

  return proofTypes[proofType];
}

/**
 * List all proof types
 */
function list() {
  return Object.values(proofTypes);
}

/**
 * Get proof type
 */
function get(proofType) {
  return proofTypes[proofType];
}

export default {
  register,
  list,
  get
};
