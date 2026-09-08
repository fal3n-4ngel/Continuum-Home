import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { encrypt, decrypt, EncryptionError } from "@/lib/utils";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'a]1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b';
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe("Fail-Closed Encryption & Versioned Decryption", () => {
  it("encrypts plaintext into a v1: versioned payload", () => {
    const raw = "Secret salary note";
    const encrypted = encrypt(raw);
    expect(encrypted).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  });

  it("decrypts v1: versioned payloads accurately", () => {
    const raw = "Confidential financial entry";
    const encrypted = encrypt(raw);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(raw);
  });

  it("handles legacy unversioned iv:tag:cipher payloads for backward compatibility", () => {
    const raw = "Legacy encrypted title";
    const encrypted = encrypt(raw);
    // Remove v1: prefix to simulate legacy payload
    const legacyPayload = encrypted.replace(/^v1:/, "");
    const decrypted = decrypt(legacyPayload);
    expect(decrypted).toBe(raw);
  });

  it("passes through unencrypted legacy plaintext strings safely", () => {
    const plain = "Plain unencrypted description";
    expect(decrypt(plain)).toBe(plain);
  });
});
