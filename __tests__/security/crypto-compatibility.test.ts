import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { encrypt, decrypt, DecryptionError } from "@/lib/utils/encryption";
import crypto from "crypto";

describe("Security Invariant: Cryptographic Envelope & Compatibility Suite", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "test-encryption-key-for-envelope-and-compatibility-tests-minimum-32-chars";
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("produces standard v1 envelope: v1:<iv_24hex>:<tag_32hex>:<ciphertext_hex>", () => {
    const plaintext = "Groceries at Trader Joe's - $142.50";
    const encrypted = encrypt(plaintext);

    expect(encrypted.startsWith("v1:")).toBe(true);

    const parts = encrypted.split(":");
    expect(parts.length).toBe(4);

    const [version, ivHex, tagHex, ciphertextHex] = parts;
    expect(version).toBe("v1");
    expect(ivHex).toMatch(/^[0-9a-f]{24}$/);
    expect(tagHex).toMatch(/^[0-9a-f]{32}$/);
    expect(ciphertextHex).toMatch(/^[0-9a-f]+$/);
  });

  it("produces non-deterministic ciphertexts for identical plaintext due to random IV", () => {
    const plaintext = "Monthly Salary Deposit";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);

    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it("maintains backward compatibility with legacy unversioned iv:tag:ciphertext envelopes", () => {
    const key = crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY!).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const secretText = "Legacy unversioned expense record";
    let ciphertext = cipher.update(secretText, "utf8", "hex");
    ciphertext += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    const legacyEnvelope = `${iv.toString("hex")}:${authTag}:${ciphertext}`;
    expect(legacyEnvelope.startsWith("v1:")).toBe(false);

    const decrypted = decrypt(legacyEnvelope);
    expect(decrypted).toBe(secretText);
  });

  it("detects tampering with ciphertext and throws DecryptionError", () => {
    const encrypted = encrypt("Confidential salary data: $150,000");
    const parts = encrypted.split(":");

    const lastChar = parts[3].slice(-1);
    const flippedChar = lastChar === "a" ? "b" : "a";
    const tamperedCiphertext = parts[3].slice(0, -1) + flippedChar;
    const tamperedEnvelope = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertext}`;

    expect(() => decrypt(tamperedEnvelope)).toThrow(DecryptionError);
  });

  it("detects tampering with authentication tag and throws DecryptionError", () => {
    const encrypted = encrypt("Stock purchase: 50 AAPL shares");
    const parts = encrypted.split(":");

    const tamperedTag = "00000000000000000000000000000000";
    const tamperedEnvelope = `${parts[0]}:${parts[1]}:${tamperedTag}:${parts[3]}`;

    expect(() => decrypt(tamperedEnvelope)).toThrow(DecryptionError);
  });

  it("detects tampering with IV and throws DecryptionError", () => {
    const encrypted = encrypt("Portfolio holding details");
    const parts = encrypted.split(":");

    const tamperedIv = "ffffffffffffffffffffffff";
    const tamperedEnvelope = `${parts[0]}:${tamperedIv}:${parts[2]}:${parts[3]}`;

    expect(() => decrypt(tamperedEnvelope)).toThrow(DecryptionError);
  });

  it("rejects decryption with wrong encryption key and throws DecryptionError", () => {
    process.env.ENCRYPTION_KEY = "key-alpha-32-chars-long-secret-key-1";
    const ciphertext = encrypt("Confidential data protected by key A");

    process.env.ENCRYPTION_KEY = "key-bravo-32-chars-long-secret-key-2";
    expect(() => decrypt(ciphertext)).toThrow(DecryptionError);
  });

  it("defensively handles non-ciphertexts and malformed strings", () => {
    expect(decrypt("")).toBe("");
    expect(decrypt("plaintext-no-colons")).toBe("plaintext-no-colons");
    expect(decrypt("v1:malformed")).toBe("v1:malformed");
  });
});
