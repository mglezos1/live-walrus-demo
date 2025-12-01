import fs from "fs";
import { execSync } from "child_process";
import crypto from "crypto";
import { buildPoseidon } from "circomlibjs";

// Convert a buffer to BigInt safely (Poseidon input)
function bufferToBigInt(buf) {
    const hex = buf.toString("hex");
    return BigInt("0x" + hex);
}

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("❌ Usage: node upload_poseidon_fixed.js <file>");
        process.exit(1);
    }

    console.log(`📄 Reading file: ${filePath}`);
    const plaintext = fs.readFileSync(filePath);

    // --- 1. ENCRYPT THE FILE ---
    console.log("🔐 Encrypting file...");
    const key = crypto.randomBytes(32);     // AES-256 key
    const iv = crypto.randomBytes(12);      // GCM IV

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    fs.writeFileSync("encrypted.bin", encrypted);
    console.log("💾 Encrypted file saved to encrypted.bin");

    // --- 2. COMPUTE POSEIDON HASH OF ENCRYPTED DATA ---
    console.log("🔢 Building Poseidon...");
    const poseidon = await buildPoseidon();

    console.log("⚙️ Computing Poseidon hash of encrypted data...");

    const encryptedBigInt = bufferToBigInt(encrypted);
    const poseidonHash = poseidon.F.toObject(poseidon([encryptedBigInt])).toString();

    console.log("🔢 Poseidon(encrypted.bin) =", poseidonHash);

    // --- 3. SAVE METADATA ---
    const metadata = {
        file: filePath,
        walrus: {},
        hashing: {
            poseidonEncryptedDecimal: poseidonHash
        },
        encryption: {
            algorithm: "aes-256-gcm",
            keyHex: key.toString("hex"),
            ivHex: iv.toString("hex"),
            authTagHex: authTag.toString("hex")
        },
        createdAt: new Date().toISOString()
    };

    fs.writeFileSync("metadata.json", JSON.stringify(metadata, null, 2));
    console.log("📝 Saved metadata.json");

    // --- 4. UPLOAD TO WALRUS ---
    console.log("⬆️ Uploading encrypted blob to Walrus...");

    const cmd = `walrus store encrypted.bin --wallet /root/.sui/sui_config/client.yaml --gas-budget 20000000 --epochs 5 --json`;
    const output = execSync(cmd).toString();

    console.log("📦 Walrus Output:\n", output);

    const result = JSON.parse(output);
    const blobId = result[0].blobStoreResult.newlyCreated.blobObject.blobId;

    console.log(`✅ Upload successful! Blob ID: ${blobId}`);

    // Save blobId into metadata
    metadata.walrus.blobId = blobId;
    fs.writeFileSync("metadata.json", JSON.stringify(metadata, null, 2));
    console.log("📌 Updated metadata.json with Blob ID");
}

main();
