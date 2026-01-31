import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import multer from "multer";

// Import routes
import capabilitiesRoutes from "./routes/capabilities.js";
import datasetsRoutes from "./routes/datasets.js";
import proofsRoutes from "./routes/proofs.js";
import verifierRoutes from "./routes/verifier.js";

// Import controllers
import uploadDataset from "./controllers/uploadDatasetController.js";
import {
  issueCapabilityController,
  getCapabilityController,
  listCapabilitiesController,
  getCapabilitiesForDatasetController,
  getIssuerPublicKeyController,
} from "./controllers/capabilityController.js";
import { generateProofController } from "./controllers/proofGenerationController.js";
import {
  submitProofController,
  getProofStatusController,
} from "./controllers/proofSubmissionController.js";

// Needed for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: "uploads/" });

// --------------------
// MIDDLEWARE
// --------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// FRONTEND
// --------------------
app.use("/frontend", express.static(path.join(__dirname, "frontend")));
app.use("/", express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// --------------------
// HEALTH CHECK
// --------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --------------------
// ROUTES
// --------------------

// Dataset routes
app.post("/datasets/upload", upload.single("file"), uploadDataset);
app.get("/datasets", datasetsRoutes);
app.get("/datasets/:blobId", datasetsRoutes);

// Capability routes
app.post("/capabilities/issue", issueCapabilityController);
app.get("/capabilities", listCapabilitiesController);
app.get("/capabilities/:id", getCapabilityController);
app.get("/capabilities/dataset/:dataset_id_hash", getCapabilitiesForDatasetController);
app.get("/capabilities/issuer/public-key", getIssuerPublicKeyController);

// Proof routes
app.post("/proofs/generate", generateProofController);
app.post("/proofs/submit", submitProofController);
app.get("/proofs/:proofId/status", getProofStatusController);

// Verifier routes
app.get("/verifier/proofs/:proofId", verifierRoutes);
app.get("/verifier/datasets/:blobId/proofs", verifierRoutes);

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log(`ZK server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
