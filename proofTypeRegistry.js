// proofTypeRegistry.js

const proofTypes = {};

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

function list() {
  return Object.values(proofTypes);
}

function get(proofType) {
  return proofTypes[proofType];
}

export default {
  register,
  list,
  get
};
