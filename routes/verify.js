import express from "express";

const router = express.Router();

// POST /verify
router.post("/", async (req, res) => {
  res.json({
    message: "verify endpoint hit"
  });
});

export default router;
