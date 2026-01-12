import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import age18Router from "./routes/age18.js";
import uploadDatasetRouter from "./routes/uploadDataset.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/proof/age18", age18Router);
app.use("/upload", uploadDatasetRouter);

// dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static frontend (optional)
app.use(express.static(path.join(__dirname, "frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// Start server
app.listen(3000, () => {
  console.log("ZKP backend running on http://localhost:3000");
});
