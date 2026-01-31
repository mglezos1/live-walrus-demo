import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY_DIR = path.join(__dirname, "..", "keys");
const PRIV_KEY_PATH = path.join(KEY_DIR, "capability_private.key");
const PUB_KEY_PATH = path.join(KEY_DIR, "capability_public.key");

// ------------------------------------
// Ensure keypair exists (PERSISTENT)
// ------------------------------------
function loadOrCreateKeys() {
  if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR);
  }

  if (!fs.existsSync(PRIV_KEY_PATH) || !fs.existsSync(PUB_KEY_PATH)) {
    console.log("[capability] Generating new Ed25519 keypair");

    const { publicKey, privateKey } =
      crypto.generateKeyPairSync("ed25519");

    fs.writeFileSync(
      PRIV_KEY_PATH,
      privateKey.export({ type: "pkcs8", format: "pem" })
    );

    fs.writeFileSync(
      PUB_KEY_PATH,
      publicKey.export({ type: "spki", format: "pem" })
    );
  }

  const privateKey = crypto.createPrivateKey(
    fs.readFileSync(PRIV_KEY_PATH)
  );

  const publicKey = crypto.createPublicKey(
    fs.readFileSync(PUB_KEY_PATH)
  );

  return { privateKey, publicKey };
}

const { privateKey, publicKey } = loadOrCreateKeys();

// ------------------------------------
// Issue capability
// ------------------------------------
export function issueCapability({ role, ttlSeconds = 3600 }) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    role,
    issuedAt: now,
    expiresAt: now + ttlSeconds,
    issuer: "zk-backend",
  };

  const payloadBytes = Buffer.from(JSON.stringify(payload));
  const signature = crypto.sign(null, payloadBytes, privateKey);

  return (
    payloadBytes.toString("base64") +
    "." +
    signature.toString("base64")
  );
}

// ------------------------------------
// Verify capability
// ------------------------------------
export function verifyCapability(token) {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) {
    throw new Error("Malformed capability token");
  }

  const payloadBytes = Buffer.from(payloadB64, "base64");
  const signature = Buffer.from(sigB64, "base64");

  const valid = crypto.verify(
    null,
    payloadBytes,
    publicKey,
    signature
  );

  if (!valid) {
    throw new Error("Invalid capability signature");
  }

  const payload = JSON.parse(payloadBytes.toString());

  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) {
    throw new Error("Capability expired");
  }

  return payload;
}
