import fs from "fs";
import { execSync } from "child_process";
import crypto from "crypto";
import { buildPoseidon } from "circomlibjs";

// Convert buffer → BigInt
function bufferToBigInt(buf) {
    return BigInt("0x" + buf.toString("hex"));
}

async function main() {
    console.log("📄 Loading metadata.json...");
    const metadata = JSON.parse(fs.readFileSync("metadata.json", "utf8"));

    const blobId = metadata.walrus.blobId;
    const keyHex = metadata.encryption.keyHex;
    const ivHex = metadata.encryption.ivHex;
    const authTagHex = metadata.encryption.authTagHex;
    const poseidonExpected = metadata.hashing.poseidonEncryptedDecimal;

    if (!blobId) {
        console.error("❌ ERROR: No blobId found in metadata.json");
        process.exit(1);
    }

    console.log("🔽 Downloading encrypted blob from Walrus...");
    execSync(
        `walrus read ${blobId} --wallet /root/.sui/sui_config/client.yaml --out encrypted_downloaded.bin`,
        { stdio: "inherit" }
    );

    const encrypted = fs.readFileSync("encrypted_downloaded.bin");

    console.log("🔢 Computing Poseidon(encrypted_downloaded.bin)...");
    const poseidon = await buildPoseidon();
    const encryptedBigInt = bufferToBigInt(encrypted);

    const poseidonComputed = poseidon.F.toObject(
        poseidon([encryptedBigInt])
    ).toString();

    console.log("Expected Poseidon:", poseidonExpected);
    console.log("Computed Poseidon:", poseidonComputed);

    if (poseidonComputed !== poseidonExpected) {
        console.error("❌ Poseidon hash mismatch — data tampered or corrupted!");
        process.exit(1);
    }

    console.log("✅ Poseidon hash verified — integrity OK");

    // ---- DECRYPT ----
    console.log("🔓 Decrypting file...");

    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    fs.writeFileSync("decrypted_output.txt", decrypted);
    console.log("✅ File decrypted: decrypted_output.txt");
}

main();
