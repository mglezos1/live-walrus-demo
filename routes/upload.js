// routes/upload.js
const express = require("express");
const multer = require("multer");
const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    res.json({
        message: "File uploaded successfully",
        filename: req.file.filename
    });
});

module.exports = router;
