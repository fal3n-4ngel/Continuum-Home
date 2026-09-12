import crypto from "crypto";
import zlib from "zlib";
import { env } from "@/lib/utils/env";
import { notifyError } from "./error-notifier";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

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



const MIN_ENTROPY_BITS_PER_CHAR = 3.0;
const MIN_COMPRESSION_RATIO = 0.65;
const MAX_SEQUENTIAL_RUN = 5;
const MAX_REPEATED_RUN = 4;

const PROHIBITED_KEY_PATTERNS = [
  "your-custom-super-secret",
  "super-secret-key",
  "secret-key-phrase",
  "change-me",
  "password123",
  "default-encryption-key",
  "your-encryption-key",
  "placeholder-key",
  "default-key",
  "abcdefghijklmnopqrstuvwxyz",
];

function shannonEntropy(input: string): number {
  const freq = new Map<string, number>();
  for (const ch of input) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  const len = input.length;
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function compressionRatio(input: string): number {
  const original = Buffer.byteLength(input, "utf8");
  const compressed = zlib.deflateRawSync(Buffer.from(input, "utf8")).length;
  return compressed / original;
}

function longestSequentialRun(input: string): number {
  let longest = 1;
  let current = 1;
  for (let i = 1; i < input.length; i++) {
    const diff = input.charCodeAt(i) - input.charCodeAt(i - 1);
    current = diff === 1 || diff === -1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

function longestRepeatedRun(input: string): number {
  let longest = 1;
  let current = 1;
  for (let i = 1; i < input.length; i++) {
    current = input[i] === input[i - 1] ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function validateEncryptionKey(secret: unknown): { valid: boolean; error?: string } {
  if (!secret || typeof secret !== "string") {
    return { valid: false, error: "ENCRYPTION_KEY environment variable is required." };
  }

  const trimmed = secret.trim();
  if (trimmed.length < 32) {
    return {
      valid: false,
      error: "ENCRYPTION_KEY must be at least 32 characters long (minimum 256-bit key recommended via 'openssl rand -base64 32').",
    };
  }

  const lower = trimmed.toLowerCase();
  for (const pattern of PROHIBITED_KEY_PATTERNS) {
    if (lower.includes(pattern)) {
      return {
        valid: false,
        error: `ENCRYPTION_KEY contains prohibited weak or placeholder pattern "${pattern}". Generate a secure key using 'openssl rand -base64 32'.`,
      };
    }
  }

  const entropy = shannonEntropy(trimmed);
  if (entropy < MIN_ENTROPY_BITS_PER_CHAR) {
    return {
      valid: false,
      error: `ENCRYPTION_KEY lacks sufficient entropy (${entropy.toFixed(2)} bits/char, need ≥ ${MIN_ENTROPY_BITS_PER_CHAR}). Generate a cryptographically secure key using 'openssl rand -base64 32'.`,
    };
  }

  const ratio = compressionRatio(trimmed);
  if (ratio < MIN_COMPRESSION_RATIO) {
    return {
      valid: false,
      error: `ENCRYPTION_KEY looks patterned or repetitive (compresses to ${(ratio * 100).toFixed(0)}% of its size). Generate a cryptographically secure key using 'openssl rand -base64 32'.`,
    };
  }

  const seqRun = longestSequentialRun(trimmed);
  if (seqRun > MAX_SEQUENTIAL_RUN) {
    return {
      valid: false,
      error: `ENCRYPTION_KEY contains a sequential run of ${seqRun} characters (e.g. "abcdef", "123456"). Generate a secure key using 'openssl rand -base64 32'.`,
    };
  }

  const repRun = longestRepeatedRun(trimmed);
  if (repRun > MAX_REPEATED_RUN) {
    return {
      valid: false,
      error: `ENCRYPTION_KEY contains a repeated-character run of ${repRun} (e.g. "aaaaa"). Generate a secure key using 'openssl rand -base64 32'.`,
    };
  }

  return { valid: true };
}


let cachedKey: { secret: string; key: Buffer } | null = null;

function getEncryptionKey(): Buffer {
  const secret = env.ENCRYPTION_KEY;

  if (cachedKey && cachedKey.secret === secret) {
    return cachedKey.key;
  }

  const validation = validateEncryptionKey(secret);
  if (!validation.valid) {
    throw new EncryptionError(validation.error || "Invalid ENCRYPTION_KEY");
  }

  const key = crypto.createHash("sha256").update(secret as string).digest();
  cachedKey = { secret: secret as string, key };
  return key;
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

function parseEncryptedPayload(
  encryptedText: string
): { ivHex: string; authTagHex: string; ciphertextHex: string } | null {
  const body = encryptedText.startsWith("v1:") ? encryptedText.slice(3) : encryptedText;
  const parts = body.split(":");
  if (parts.length !== 3) return null;

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const isHex = (s: string) => s.length > 0 && /^[0-9a-f]+$/i.test(s);

  if (
    !isHex(ivHex) ||
    !isHex(authTagHex) ||
    !isHex(ciphertextHex) ||
    ivHex.length !== IV_LENGTH * 2 ||
    authTagHex.length !== AUTH_TAG_LENGTH * 2
  ) {
    return null;
  }

  return { ivHex, authTagHex, ciphertextHex };
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") {
    return encryptedText || "";
  }

  if (!encryptedText.includes(":")) {
    return encryptedText;
  }

  const parsed = parseEncryptedPayload(encryptedText);
  if (!parsed) {
    return encryptedText;
  }
  const { ivHex, authTagHex, ciphertextHex } = parsed;

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