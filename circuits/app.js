// ------------------------------------------------------------
// Classic JS requires (no ES modules)
// ------------------------------------------------------------
const express = require("express");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config();

// ------------------------------------------------------------
// Express Setup
// ------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

console.log("PACKAGE_ID =", process.env.PACKAGE_ID);
console.log("MODULE_NAME =", process.env.MODULE_NAME);
console.log("SUI_ADDRESS =", process.env.SUI_ADDRESS);

// ------------------------------------------------------------
// Hardcoded ACCESS KEYS for demo
// ------------------------------------------------------------
const ACCESS_KEYS = {
    doctor: "doctor123",
    researcher: "research123"
};

// ------------------------------------------------------------
// Generate Selective ZKP Proof
// ------------------------------------------------------------
app.post("/generate-selective-proof", async (req, res) => {
    try {
        console.log("🔍 Incoming ZKP request:", req.body);

        const payload = req.body;

        // Only fields the circuit supports
        const selectiveInput = {
            patientNameHash: payload.patientNameHash,
            patientIdHash: payload.patientIdHash,
            genderHash: payload.genderHash,
            addressHash: payload.addressHash,
            symptomsHash: payload.symptomsHash,
            age: payload.age,
            actual_result: payload.actual_result
        };

        fs.writeFileSync(
            "./circuits/input_selective.json",
            JSON.stringify(selectiveInput, null, 2)
        );

        console.log("Generating witness...");
        execSync(
            "node ./circuits/selective_js/generate_witness.js " +
            "./circuits/selective_js/selective.wasm " +
            "./circuits/input_selective.json " +
            "./circuits/witness_selective.wtns"
        );

        console.log("Generating proof...");
        execSync(
            "snarkjs groth16 prove " +
            "./circuits/selective.zkey " +
            "./circuits/witness_selective.wtns " +
            "./circuits/proof_selective.json " +
            "./circuits/public_selective.json"
        );

        console.log("Uploading proof.json to Walrus...");
        const walrusOutput = execSync(
            "walrus store --epochs 10 ./circuits/proof_selective.json"
        ).toString();

        // FIXED REGEX (uppercase "Blob ID:")
        console.log("==== WALRUS RAW OUTPUT START ====");
console.log(walrusOutput);
console.log("==== WALRUS RAW OUTPUT END ====");

const blobIdMatch = walrusOutput.match(/blob id:\s*([A-Za-z0-9_\-]+)/i);

        const blobId = blobIdMatch ? blobIdMatch[1] : null;

        console.log("Stored on Walrus:", blobId);

        res.json({
            ok: true,
            message: "Selective ZKP proof generated and stored.",
            blobId,
            selectiveInput
        });

    } catch (err) {
        console.error("ZKP ERROR:", err);
        res.status(500).json({ ok: false, error: err.toString() });
    }
});

// ------------------------------------------------------------
// Verify record from Walrus (doctor / research key)
// ------------------------------------------------------------
app.post("/verify-record", async (req, res) => {
    try {
        const { blobId, accessKey } = req.body;

        console.log("🔍 Incoming verification request:", req.body);

        // Check key
        let accessLevel = null;
        if (accessKey === ACCESS_KEYS.doctor) accessLevel = "doctor";
        else if (accessKey === ACCESS_KEYS.researcher) accessLevel = "research";
        else return res.json({ ok: false, error: "Invalid access key" });

        // Read the proof from Walrus
        execSync(`walrus read ${blobId} --out ./tmp/verify_blob.json`);

        const proof = JSON.parse(fs.readFileSync("./tmp/verify_blob.json"));

        // Extract only COVID result for now
        const extracted = {
            covidResult: proof.publicSignals
                ? proof.publicSignals[1]
                : "UNKNOWN",
            accessLevel
        };

        res.json({
            ok: true,
            blobId,
            extracted
        });

    } catch (err) {
        console.error("❌ VERIFY ERROR:", err);
        res.status(500).json({ ok: false, error: err.toString() });
    }
});

// ------------------------------------------------------------
// Start Server
// ------------------------------------------------------------
app.listen(3000, () => {
    console.log("ZKP backend running on http://localhost:3000");
});
