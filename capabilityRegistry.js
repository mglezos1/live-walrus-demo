// capabilityRegistry.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve paths RELATIVE TO THIS FILE (not process cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const FILE_PATH = path.join(DATA_DIR, "capabilities.json");

// In-memory cache
let capabilities = {};

// -----------------------------
// Load from disk on startup
// -----------------------------
function load() {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, "utf-8");
      capabilities = JSON.parse(raw);
      console.log("✅ Loaded capabilities from disk");
    } else {
      capabilities = {};
      console.log("ℹ️ No capabilities file yet");
    }
  } catch (err) {
    console.error("❌ Failed to load capabilities:", err);
    capabilities = {};
  }
}

// -----------------------------
// Save to disk
// -----------------------------
function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE_PATH, JSON.stringify(capabilities, null, 2));
  } catch (err) {
    console.error("❌ Failed to save capabilities:", err);
  }
}

// -----------------------------
// Public API
// -----------------------------
function create({ capabilityId, blobId, proofType }) {
  capabilities[capabilityId] = {
    capabilityId,
    blobId,
    proofType,
    active: true,
    createdAt: Date.now()
  };
  save();
}

function get(id) {
  return capabilities[id];
}

function revoke(id) {
  if (capabilities[id]) {
    capabilities[id].active = false;
    save();
  }
}

function list() {
  return Object.values(capabilities);
}

// Load immediately on import
load();

export default {
  create,
  get,
  revoke,
  list
};
