import express from "express";

const router = express.Router();

// POST /proof/age18/count
router.post("/", async (req, res) => {
  res.json({
    message: "age18 count proof endpoint hit"
  });
});

export default router;
