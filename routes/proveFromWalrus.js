import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  res.json({ message: "Proof from Walrus endpoint hit (not implemented yet)" });
});

export default router;
