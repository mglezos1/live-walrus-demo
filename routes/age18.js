import express from "express";

const router = express.Router();

// POST /proof/age18
router.post("/", async (req, res) => {
  res.json({
    message: "age18 proof endpoint hit"
  });
});

export default router;
