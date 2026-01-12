import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// ESM route imports
import uploadRoute from "./routes/upload.js";
import uploadDatasetRoute from "./routes/uploadDataset.js";
import age18Route from "./routes/age18.js";
import age18CountRoute from "./routes/age18Count.js";
import proveRoute from "./routes/prove.js";
import proveFromWalrusRoute from "./routes/proveFromWalrus.js";
import verifyRoute from "./routes/verify.js";

// ✅ New juvenile diabetes ZK route
import proofJuvenileDiabetesUnder18Count from "./routes/proofJuvenileDiabetesUnder18Count.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "frontend")));

// Routes
app.use("/upload", uploadRoute);
app.use("/upload/dataset", uploadDatasetRoute);

app.use("/proof/age18", age18Route);
app.use("/proof/age18/count", age18CountRoute);
app.use("/prove", proveRoute);
app.use("/prove-from-walrus", proveFromWalrusRoute);

app.use(
  "/proof/juvenile-diabetes/under18/count",
  proofJuvenileDiabetesUnder18Count
);

app.use("/verify", verifyRoute);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`ZK backend running on http://localhost:${PORT}`);
});
