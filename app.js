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

// Ensure uploads directory exists
import fs from 'fs/promises';
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir, { recursive: true })
  .then(() => console.log('[SETUP] Uploads directory ready:', uploadsDir))
  .catch((err) => console.error('[SETUP] Failed to create uploads directory:', err.message));

const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// --------------------
// MIDDLEWARE
// --------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// FRONTEND
// --------------------
// In development, serve old frontend for reference
// In production, serve React app from frontend-react/dist
if (process.env.NODE_ENV === 'production') {
  // Serve React app static files
  app.use(express.static(path.join(__dirname, "frontend-react", "dist")));
  
  // Serve React app for all non-API routes
  app.get("*", (req, res) => {
    // Don't serve React app for API routes
    if (req.path.startsWith("/datasets") || 
        req.path.startsWith("/capabilities") || 
        req.path.startsWith("/proofs") || 
        req.path.startsWith("/verifier") ||
        req.path.startsWith("/health")) {
      return res.status(404).json({ error: "Not found" });
    }
    res.sendFile(path.join(__dirname, "frontend-react", "dist", "index.html"));
  });
} else {
  // Development: serve old frontend for reference
  app.use("/frontend", express.static(path.join(__dirname, "frontend")));
  app.use("/", express.static(path.join(__dirname, "frontend")));
  
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
  });
}

// --------------------
// HEALTH CHECK
// --------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test endpoint to verify backend is reachable and using new code
app.get("/test", (req, res) => {
  console.log('[TEST] Test endpoint hit');
  res.json({ 
    message: "Backend is reachable", 
    timestamp: new Date().toISOString(),
    version: "2.0-with-detailed-errors",
    uploadControllerVersion: "2.0"
  });
});

// Test upload endpoint to verify multer and controller are working
app.post("/test-upload-simple", upload.single("file"), (req, res) => {
  console.log('[TEST-UPLOAD] Simple test endpoint hit');
  if (!req.file) {
    return res.status(400).json({
      error: 'No file received',
      details: 'Multer did not receive a file',
      version: '2.0'
    });
  }
  res.json({
    message: "File received successfully",
    fileName: req.file.originalname,
    fileSize: req.file.size,
    filePath: req.file.path,
    version: '2.0'
  });
});

app.post("/test-upload", (req, res) => {
  console.log('[TEST-UPLOAD] Test upload endpoint hit');
  console.log('[TEST-UPLOAD] Content-Type:', req.headers['content-type']);
  console.log('[TEST-UPLOAD] Body:', req.body);
  res.json({ message: "Test upload endpoint reached", received: true });
});

// --------------------
// ROUTES
// --------------------

// Dataset routes - with multer error handling
// GET handler for /datasets/upload - provides usage information
app.get("/datasets/upload", (req, res) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'This endpoint only accepts POST requests',
    usage: {
      method: 'POST',
      endpoint: '/datasets/upload',
      contentType: 'multipart/form-data',
      body: {
        file: 'File field containing an Excel (.xlsx, .xls) or JSON dataset file'
      },
      supportedFormats: ['Excel (.xlsx, .xls)', 'JSON (.json)']
    },
    frontend: {
      ownerPortal: '/frontend/owner.html',
      description: 'Use the Owner Portal to upload datasets via the web interface'
    },
    example: {
      curl: 'curl -X POST http://localhost:3000/datasets/upload -F "file=@your-dataset.xlsx"',
      curlJson: 'curl -X POST http://localhost:3000/datasets/upload -F "file=@your-dataset.json"'
    }
  });
});

app.post("/datasets/upload", (req, res, next) => {
  console.log('[ROUTE] POST /datasets/upload - Route handler called');
  console.log('[ROUTE] Content-Type:', req.headers['content-type']);
  
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error('[ROUTE] Multer error:', err.message);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message,
        version: '2.0'
      });
    }
    if (!req.file) {
      console.error('[ROUTE] No file received after multer');
      return res.status(400).json({
        error: 'No file received',
        details: 'Please select a file to upload',
        version: '2.0'
      });
    }
    console.log('[ROUTE] File received, calling controller. File:', req.file.originalname);
    next();
  });
}, uploadDataset);
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
app.use("/verifier", verifierRoutes);

// --------------------
// START SERVER
// --------------------
const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log(`✅ ZK server running at http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/test`);
  console.log(`✅ Upload endpoint: http://localhost:${PORT}/datasets/upload`);
  console.log('========================================');
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('[EXPRESS ERROR HANDLER]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: err.stack,
    debug: {
      url: req.url,
      method: req.method,
      contentType: req.headers['content-type']
    }
  });
});

// Handle port already in use error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error(`💡 Try one of these solutions:`);
    console.error(`   1. Kill the process: bash scripts/kill-port.sh`);
    console.error(`   2. Use a different port: PORT=3001 npm start`);
    console.error(`   3. Find and kill manually: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    throw err;
  }
});
