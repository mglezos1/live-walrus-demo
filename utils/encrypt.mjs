import crypto from "crypto";

/**
 * Encrypt a Buffer with AES-256-GCM
 * @param {Buffer} plaintext
 * @returns {Object} { ciphertext, keyHex, ivHex, authTagHex }
 */
export function encryptBuffer(plaintext) {
    const key = crypto.randomBytes(32); // AES-256
    const iv = crypto.randomBytes(12);  // Recommended for GCM

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        ciphertext: encrypted,
        keyHex: key.toString("hex"),
        ivHex: iv.toString("hex"),
        authTagHex: authTag.toString("hex")
    };
}

/**
 * Decrypt AES-256-GCM Buffer
 * @param {Buffer} ciphertext
 * @param {string} keyHex
 * @param {string} ivHex
 * @param {string} authTagHex
 * @returns {Buffer} plaintext
 */
export function decryptBuffer(ciphertext, keyHex, ivHex, authTagHex) {
    const key = Buffer.from(keyHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
