// server/verifyRoute.js
const express = require("express");
const fs = require("fs");
const router = express.Router();

// POST /verifyNegativeZKP
router.post("/verifyNegativeZKP", async (req, res) => {
    try {
        const proof = req.body.proof;
        const publicSignals = req.body.publicSignals;

        // Save temporary files required by snarkjs
        fs.writeFileSync("/home/mglez/walrus-mvp/circuits/tmp_proof.json", JSON.stringify(proof));
        fs.writeFileSync("/home/mglez/walrus-mvp/circuits/tmp_public.json", JSON.stringify(publicSignals));

        const { execSync } = require("child_process");

        // Run verifier
        execSync(`
            snarkjs groth16 verify \
            /home/mglez/walrus-mvp/circuits/verification_key.json \
            /home/mglez/walrus-mvp/circuits/tmp_public.json \
            /home/mglez/walrus-mvp/circuits/tmp_proof.json
        `);

        res.json({ valid: true });

    } catch (err) {
        console.error(err);
        res.json({ valid: false, error: err.toString() });
    }
});

module.exports = router;
