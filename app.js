import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const poseidon2 = require("./circuits/poseidon2.cjs");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// frontend
app.use(express.static(path.join(__dirname, "frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/index.html"));
});

// ----------------------------------------------------
// SUBMIT (Generate proof + upload to Walrus)
// ----------------------------------------------------
app.post("/submit", async (req, res) => {
    const {
        name,
        patientId,
        gender,
        address,
        symptoms,
        age,
        actual_result
    } = req.body;

    const hashText = async (txt) => {
        if (!txt || txt.trim() === "") return "0";
        const hex = Buffer.from(txt).toString("hex") || "0";
        const result = await poseidon2([BigInt("0x" + hex)]);
        return result.toString();
    };

    const genderHash = await hashText(gender);
    const addressHash = await hashText(address);
    const symptomsHash = await hashText(symptoms);

    const hr = "0";
    const bpHash = "0";

    const zkpInput = {
        patientId: patientId.toString(),
        testNonce: "123456",
        actual_result: actual_result.toString(),
        age: age.toString(),
        hr,
        genderHash,
        addressHash,
        bpHash,
        symptomsHash
    };

    fs.writeFileSync("circuits/input.json", JSON.stringify(zkpInput, null, 2));

    const witnessCmd = `
        cd circuits/selective_proof_js &&
        node generate_witness.cjs ./selective_proof.wasm ../../circuits/input.json ../../circuits/witness.wtns &&
        cd ../.. &&
        snarkjs groth16 prove circuits/selective_proof_final.zkey circuits/witness.wtns circuits/proof.json circuits/public.json
    `;

    exec(witnessCmd, (error, stdout, stderr) => {
        console.log("ZKP generation stdout:", stdout);
        console.log("ZKP generation stderr:", stderr);

        if (error) {
            console.error("ZKP generation failed:", stderr);
            return res.status(500).json({ error: "ZKP generation failed", details: stderr });
        }

        exec(
            `/usr/local/bin/walrus store --epochs 10 circuits/proof.json`,
            (err, out, errout) => {
                console.log("\nWalrus exit code:", err ? err.code : 0);
                console.log("Walrus STDOUT:", out);
                console.log("Walrus STDERR:", errout);

                if (err) {
                    console.error(errout);
                    return res.status(500).json({ error: "Walrus upload failed", details: errout });
                }

                const match = out.match(/Blob ID:\s+([A-Za-z0-9\-_]+)/);
                const blobId = match ? match[1] : null;

                const storedData = {
                    name,
                    gender,
                    address,
                    symptoms,
                    age,
                    patientId,
                    actual_result,
                    genderHash,
                    addressHash,
                    symptomsHash,
                    hr,
                    bpHash,
                    testNonce: "123456"
                };

                fs.writeFileSync(
                    "circuits/tmp_output_raw.json",
                    JSON.stringify(storedData, null, 2)
                );

                return res.json({ ok: true, blobId });
            }
        );
    });
});

// ----------------------------------------------------
// RETRIEVE (read blob + selective reveal)
// ----------------------------------------------------
app.post("/retrieve", (req, res) => {
    const { blobId, accessKey } = req.body;

    if (!blobId) return res.status(400).json({ error: "Missing blobId" });
    if (!accessKey) return res.status(400).json({ error: "Missing accessKey" });

    const fetchCmd =
        `/usr/local/bin/walrus read ${blobId} ` +
        `--wallet /root/.sui/sui_config/client.yaml ` +
        `--out circuits/tmp_proof.json`;

    exec(fetchCmd, (err, stdout, stderr) => {
        console.log("Walrus READ stdout:", stdout);
        console.log("Walrus READ stderr:", stderr);

        if (err) {
            return res.status(500).json({
                error: "Failed to fetch blob",
                details: stderr || err
            });
        }

        const raw = JSON.parse(
            fs.readFileSync("circuits/tmp_output_raw.json", "utf8")
        );

        const covidText = raw.actual_result == "1" ? "Positive" : "Negative";

        if (accessKey === "doctor123") {
            return res.json({
                role: "doctor",
                blobId,
                ...raw,
                covidResult: covidText
            });
        }

        if (accessKey === "research123") {
            return res.json({
                role: "researcher",
                blobId,
                covidResult: covidText,
                name: "N/A",
                gender: "N/A",
                address: "N/A",
                symptoms: "N/A",
                age: "N/A",
                patientId: "N/A"
            });
        }

        return res.status(401).json({ error: "Invalid access key" });
    });
});

// ----------------------------------------------------
app.listen(3000, () => {
    console.log("ZKP backend running on http://localhost:3000");
});
