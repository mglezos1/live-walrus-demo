// routes/prove.js
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
    res.json({ message: "Proof generation endpoint hit (not implemented yet)" });
});

module.exports = router;
