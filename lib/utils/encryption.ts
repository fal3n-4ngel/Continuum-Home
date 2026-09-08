import crypto from "crypto";
import { env } from "@/lib/utils/env";
import { notifyError } from "./error-notifier";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export class EncryptionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EncryptionError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DecryptionError";
  }
}

function sendCryptoDiscordAlert(title: string, details: string, isCritical = false): void {
  notifyError({
    context: `🔐 Security: ${title}`,
    error: details,
    status: isCritical ? 500 : 400,
    isCritical,
  });
}

function getEncryptionKey(): Buffer {
  const secret = env.ENCRYPTION_KEY;
  if (secret) {
    return crypto.createHash("sha256").update(secret).digest();
  }

  throw new Error('ENCRYPTION_KEY environment variable is required for encryption operations');
}

export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Encryption failed:", msg);
    sendCryptoDiscordAlert("Encryption Failure", `Payload encryption failed: ${msg}`, true);
    throw new EncryptionError(`Failed to encrypt sensitive data: ${msg}`, err);
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") {
    return encryptedText || "";
  }

  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  let ivHex = "";
  let authTagHex = "";
  let ciphertextHex = "";

  if (encryptedText.startsWith("v1:")) {
    const parts = encryptedText.slice(3).split(":");
    if (parts.length === 3) {
      [ivHex, authTagHex, ciphertextHex] = parts;
    }
  } else {
    const parts = encryptedText.split(":");
    if (parts.length === 3) {
      [ivHex, authTagHex, ciphertextHex] = parts;
    }
  }

  if (!ivHex || !authTagHex || !ciphertextHex) {
    return encryptedText;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Decryption failed:", msg);
    sendCryptoDiscordAlert("Decryption Failure", `Payload decryption failed: ${msg}`, false);
    throw new DecryptionError(`Failed to decrypt sensitive data: ${msg}`, err);
  }
}
