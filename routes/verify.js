// routes/verify.js
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
    res.json({ message: "Verification endpoint hit (not implemented yet)" });
});

module.exports = router;
