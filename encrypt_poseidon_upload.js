import { execSync } from "child_process";
import fs from "fs";
import crypto from "crypto";
import * as circomlib from "circomlibjs";

const WALRUS_WALLET_PATH = "/root/.sui/sui_config/client.yaml";
const GAS_BUDGET = 20_000_000;
const EPOCHS = 5;

function sha256Hex(buffer) {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

async function computePoseidonHash(buffer) {
  console.log("🔢 Building Poseidon hash function (circomlibjs)...");
  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  const shaHex = sha256Hex(buffer);
  const inputBigInt = BigInt("0x" + shaHex);
  const poseidonResult = poseidon([inputBigInt]);
  const poseidonDecimal = F.toString(poseidonResult);

  return {
    shaHex,
    poseidonDecimal,
  };
}

function encryptBuffer(buffer) {
  console.log("🔐 Generating AES-256 key...");
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  console.log("🔐 Encrypting file...");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { encrypted, key, iv, authTag };
}

function walrusStore(filePath) {
  console.log("⬆️ Uploading encrypted blob to Walrus...");

  const cmd = [
    "walrus store",
    filePath,
    `--wallet ${WALRUS_WALLET_PATH}`,
    `--gas-budget ${GAS_BUDGET}`,
    `--epochs ${EPOCHS}`,
    "--json",
  ].join(" ");

  console.log("🔵 Running:", cmd);
  const stdout = execSync(cmd, { encoding: "utf8" });
  console.log("CLI Output:\n", stdout);

  const parsed = JSON.parse(stdout);
  return parsed;
}

async function main() {
  const inputPath = process.argv[2] || "test.txt";

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`📄 Reading file: ${inputPath}`);
  const fileBuffer = fs.readFileSync(inputPath);

  console.log("⚙️ Computing Poseidon hash of file contents...");
  const { shaHex, poseidonDecimal } = await computePoseidonHash(fileBuffer);

  const { encrypted, key, iv, authTag } = encryptBuffer(fileBuffer);

  const encryptedPath = "encrypted.bin";
  fs.writeFileSync(encryptedPath, encrypted);
  console.log(`💾 Encrypted file written to: ${encryptedPath}`);

  const storeResult = walrusStore(encryptedPath);
  const blobInfo =
    storeResult[0]?.blobStoreResult?.newlyCreated?.blobObject ?? null;

  if (!blobInfo) {
    console.error("❌ Could not find blob information in Walrus response.");
    process.exit(1);
  }

  const blobId = blobInfo.blobId;
  console.log("\n✅ UPLOAD COMPLETE");
  console.log("Blob ID:", blobId);

  const metadata = {
    file: inputPath,
    walrus: {
      blobId,
      registeredEpoch: blobInfo.registeredEpoch,
      storageStartEpoch: blobInfo.storage?.startEpoch,
      storageEndEpoch: blobInfo.storage?.endEpoch,
      encodingType: blobInfo.encodingType,
      size: blobInfo.size,
    },
    hashing: {
      sha256Hex: shaHex,
      poseidonDecimal,
    },
    encryption: {
      algorithm: "aes-256-gcm",
      keyHex: key.toString("hex"),
      ivHex: iv.toString("hex"),
      authTagHex: authTag.toString("hex"),
    },
    createdAt: new Date().toISOString(),
  };

  const metadataPath = "metadata.json";
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n📝 Metadata saved to: ${metadataPath}`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
