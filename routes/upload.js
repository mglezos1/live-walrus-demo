import express from "express";

const router = express.Router();

// POST /upload
router.post("/", async (req, res) => {
  res.json({
    status: "upload endpoint hit"
  });
});

export default router;

