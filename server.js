const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");
const capabilityRoutes = require("./routes/capabilities");
app.use("/capabilities", capabilityRoutes);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Encryption password
const PASSWORD = "Starwars#365";

// Create encrypted blob + public JSON + proof, upload to Walrus, store on Sui
app.post("/selective-zkp", async (req, res) => {
    try {
        console.log("Incoming selective ZKP request:", req.body);

        const patient = req.body;

        // -------------------------------
        // 1. Encrypt full patient JSON
        // -------------------------------
        const plaintext = JSON.stringify(patient, null, 2);
        fs.writeFileSync("tmp_plain.json", plaintext);

        execSync(
            `openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"${PASSWORD}" -in tmp_plain.json -out encrypted.bin`
        );

        // -------------------------------
        // 2. Upload encrypted blob to Walrus
        // -------------------------------
        const walrusOut = execSync(
            `/usr/local/bin/walrus store --epochs 10 encrypted.bin`
        ).toString();

        const blobId = walrusOut.match(/blob ID: ([A-Za-z0-9]+)/)[1];

        console.log("Encrypted Walrus Blob:", blobId);

        // -------------------------------
        // 3. Generate fake zk proof
        //    (Your real proof script will go here)
        // -------------------------------
        const fakeProof = JSON.stringify({ ok: true, test: "demo-proof" });
        const fakePublic = JSON.stringify({ covid_status: patient.actual_result });

        // -------------------------------
        // 4. Call Sui Move contract
        // -------------------------------
        const suiCmd = `
            sui client call 
            --package 0x4c3b80cdd1d5b81da39e8043980826f55bedadbcf41f77c97555c20994568aa6 
            --module ZKRecordC 
            --function create_record 
            --args "${blobId}" '${fakeProof}' '${fakePublic}' 
            --gas-budget 100000000
        `;

        const suiOut = execSync(suiCmd).toString();

        console.log("Sui output:", suiOut);

        return res.json({
            ok: true,
            blobId,
            publicSignals: { covid_status: patient.actual_result }
        });

    } catch (err) {
        console.error("ZKP ERROR:", err);
        return res.json({ ok: false, error: String(err) });
    }
});

// ------------------------
// Start server
// ------------------------
app.listen(3000, () => {
    console.log("Backend running on http://localhost:3000");
});
