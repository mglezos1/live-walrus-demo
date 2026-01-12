import express from "express";

const router = express.Router();

// POST /upload/dataset
router.post("/", async (req, res) => {
  try {
    // Keep placeholder to unblock server
    res.json({
      status: "uploadDataset endpoint hit"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "uploadDataset failed" });
  }
});

export default router;
