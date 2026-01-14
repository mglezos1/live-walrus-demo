import express from "express";

// --------------------
// APP INIT (THIS MUST COME FIRST)
// --------------------
const app = express();
app.use(express.json());

// --------------------
// ROUTES
// --------------------

// Generic proof route
import proveGenericRoutes from "./routes/proveGeneric.js";
app.use("/proof", proveGenericRoutes);

// (Other routes can stay, but are unused for now)
import capabilityRoutes from "./routes/capabilities.js";
app.use("/capabilities", capabilityRoutes);

// --------------------
// HEALTH CHECK
// --------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// --------------------
// START SERVER
// --------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`ZK backend running on http://localhost:${PORT}`);
});
