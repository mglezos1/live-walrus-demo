const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:8080" }));

// Store last submitted patient data so verify page can read it
let LAST_PATIENT_DATA = null;

// ---------------------------
//  POST /selective-zkp
// ---------------------------
app.post("/selective-zkp", (req, res) => {
    console.log("Received ZKP request:", req.body);

    LAST_PATIENT_DATA = {
        patientName: req.body.patientName,
        patientId: req.body.patientId,
        age: req.body.age,
        gender: req.body.gender,
        address: req.body.address,
        hr: req.body.hr,
        bp: req.body.bp,
        symptoms: req.body.symptoms,
        actual_result: req.body.actual_result
    };

    // Save input for witness generator
    fs.writeFileSync(
        "../circuits/input_selective.json",
        JSON.stringify({
            patientName: req.body.patientName,
            patientId: req.body.patientId,
            age: req.body.age,
            gender: req.body.gender,
            address: req.body.address,
            hr: req.body.hr,
            bp: req.body.bp,
            symptoms: req.body.symptoms,
            actual_result: req.body.actual_result,
            testNonce: "12345"
        })
    );

    try {
        execSync(
            "node ../circuits/selective_proof_js/generate_witness.cjs ../circuits/selective_js/selective.wasm input_selective.json witness.wtns",
            { stdio: "inherit" }
        );

        execSync(
            "snarkjs groth16 prove ../circuits/selective_proof_final.zkey witness.wtns proof.json public.json",
            { stdio: "inherit" }
        );

        const publicSignals = JSON.parse(fs.readFileSync("public.json", "utf8"));

        return res.json({
            ok: true,
            message: "ZKP generated.",
            publicSignals
        });

    } catch (err) {
        console.error("ZKP Error:", err);
        return res.json({ ok: false, error: String(err) });
    }
});

// ---------------------------
//  GET /verify-access?key=XYZ
// ---------------------------
app.get("/verify-access", (req, res) => {
    const key = req.query.key;
    if (!LAST_PATIENT_DATA) {
        return res.json({ ok: false, error: "No ZKP data yet." });
    }

    if (key === "DOCTOR123") {
        return res.json({
            ok: true,
            role: "doctor",
            allowed: {
                name: LAST_PATIENT_DATA.patientName,
                id: LAST_PATIENT_DATA.patientId,
                gender: LAST_PATIENT_DATA.gender,
                address: LAST_PATIENT_DATA.address,
                symptoms: LAST_PATIENT_DATA.symptoms,
                bloodPressure: LAST_PATIENT_DATA.bp,
                heartRate: LAST_PATIENT_DATA.hr,
                covidResult: LAST_PATIENT_DATA.actual_result
            }
        });
    }

    if (key === "RESEARCH123") {
        return res.json({
            ok: true,
            role: "research",
            allowed: {
                covidResult: LAST_PATIENT_DATA.actual_result
            }
        });
    }

    return res.json({ ok: false, error: "Invalid access key." });
});

// ---------------------------
app.listen(3000, () => {
    console.log("Backend running on port 3000");
});
