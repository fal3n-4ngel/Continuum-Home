import { describe, it, expect } from "vitest";
import { encrypt, decrypt, EncryptionError } from "@/lib/utils";

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
