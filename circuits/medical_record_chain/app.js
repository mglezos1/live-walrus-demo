require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------
// CONFIG
// -------------------------
const WALRUS = "/usr/local/bin/walrus";
const SUICLI = "sui client call";

const PACKAGE_ID = "0xc1b078f0a9b1ab340b4d921ab6bb148fb5c60656371b5b9ea421a0152f830401";

const CIRCUIT_DIR = path.join(__dirname, "circuits");
const BUILD_DIR = path.join(__dirname, "build");

const ZKEY = path.join(CIRCUIT_DIR, "selective_final.zkey");
const WASM = path.join(BUILD_DIR, "selective_js/selective.wasm");
const WITGEN = path.join(BUILD_DIR, "selective_js/generate_witness.mjs");

const AES_KEY = Buffer.from(process.env.AES_KEY, "utf8");


// ----------------------------------------------
// AES-256-CBC Encryption & Decryption Helpers
// ----------------------------------------------
function encryptData(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", AES_KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return { iv: iv.toString("base64"), encrypted };
}

function decryptData(encrypted, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    AES_KEY,
    Buffer.from(iv, "base64")
  );
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}


// -------------------------
// 1. SELECTIVE ZKP GENERATION
// -------------------------
app.post("/selective-zkp", async (req, res) => {
  try {
    const input = req.body;

    // Patient ID is already a BigInt hash from frontend
    const patientIdHash = input.patientId;
    const rawInputJSON = JSON.stringify(input);

    const witnessPath = path.join(CIRCUIT_DIR, "witness.wtns");
    const proofPath = path.join(CIRCUIT_DIR, "proof.json");
    const publicPath = path.join(CIRCUIT_DIR, "public.json");

    // Generate witness
    const tmpInputPath = path.join(CIRCUIT_DIR, "input_tmp.json");
    fs.writeFileSync(tmpInputPath, rawInputJSON);

    execSync(`node ${WITGEN} ${WASM} ${tmpInputPath} ${witnessPath}`);

    execSync(`snarkjs groth16 prove ${ZKEY} ${witnessPath} ${proofPath} ${publicPath}`);

    // -------------------------
    // ENCRYPT INPUT
    // -------------------------
    const { iv, encrypted } = encryptData(rawInputJSON);
    const encPath = path.join(CIRCUIT_DIR, "input.enc");
    const ivPath = path.join(CIRCUIT_DIR, "iv.txt");

    fs.writeFileSync(encPath, encrypted);
    fs.writeFileSync(ivPath, iv);

    // -------------------------
    // BUNDLE FILES
    // -------------------------
    const bundleDir = path.join(CIRCUIT_DIR, "bundle_tmp");
    const bundleTar = path.join(CIRCUIT_DIR, "proof_bundle.tar");

    execSync(`rm -rf ${bundleDir}`);
    execSync(`mkdir -p ${bundleDir}`);

    fs.copyFileSync(encPath, path.join(bundleDir, "input.enc"));
    fs.copyFileSync(ivPath, path.join(bundleDir, "iv.txt"));
    fs.copyFileSync(proofPath, path.join(bundleDir, "proof.json"));
    fs.copyFileSync(publicPath, path.join(bundleDir, "public.json"));

    execSync(`tar -cf ${bundleTar} -C ${bundleDir} .`);

    // -------------------------
    // UPLOAD TO WALRUS
    // -------------------------
    const uploadOutput = execSync(
      `${WALRUS} store --epochs 10 ${bundleTar}`
    ).toString();

    const match = uploadOutput.match(/blob ID: ([A-Za-z0-9]+)/);
    const bundleBlob = match ? match[1] : null;

    // -------------------------
    // CALL SUI MOVE CONTRACT
    // -------------------------
    const timestamp = Date.now().toString();
    const blobBytes = Buffer.from(bundleBlob).toString("hex");

    const suiCall = execSync(
      `${SUICLI} \
       --package ${PACKAGE_ID} \
       --module medical_record \
       --function create_record \
       --args ${patientIdHash} "0x${blobBytes}" ${timestamp} \
       --gas-budget 20000000`
    ).toString();

    // Extract object ID from output
    const objMatch = suiCall.match(/ObjectID: ([0-9a-fx]+)/i);
    const recordObjectId = objMatch ? objMatch[1] : null;

    res.json({
      ok: true,
      message: "Encrypted ZKP bundle uploaded + on-chain medical record created.",
      bundleBlob,
      recordObjectId,
      suiCallOutput: suiCall
    });

  } catch (err) {
    res.json({ ok: false, error: err.toString() });
  }
});


// -------------------------
// 2. VERIFY SELECTIVE PROOF
// -------------------------
app.post("/verify-selective", async (req, res) => {
  try {
    const { blobId, accessKey } = req.body;

    const tmp = "/tmp/walrus_verify";
    execSync(`rm -rf ${tmp}`);
    execSync(`mkdir -p ${tmp}`);

    const bundleTar = path.join(tmp, "bundle.tar");

    execSync(`${WALRUS} get ${blobId} --out ${bundleTar}`);
    execSync(`tar -xf ${bundleTar} -C ${tmp}`);

    const encryptedInput = fs.readFileSync(path.join(tmp, "input.enc"), "utf8");
    const iv = fs.readFileSync(path.join(tmp, "iv.txt"), "utf8");

    const decryptedInputJSON = decryptData(encrypted
