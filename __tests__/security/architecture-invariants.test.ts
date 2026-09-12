import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { validateEncryptionKey, encrypt, decrypt, EncryptionError, DecryptionError } from "@/lib/utils/encryption";

function getFilesRecursively(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Security Invariant: Architectural Quarantine of Privileged Admin Access", () => {
  const rootDir = process.cwd();

  it("prohibits firebase-admin in user-facing core API data routes", () => {
    const coreRoutesDir = path.join(rootDir, "app", "api", "(core)");
    const coreFiles = getFilesRecursively(coreRoutesDir);

    const userFacingDataFiles = coreFiles.filter(
      (filePath) => !filePath.includes("release-notes")
    );

    expect(userFacingDataFiles.length).toBeGreaterThan(0);

    for (const file of userFacingDataFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const relative = path.relative(rootDir, file).replace(/\\/g, "/");

      expect(content, `${relative} must not import firebase-admin`).not.toMatch(/from\s+["']firebase-admin(\/[^"']*)?["']/);
      expect(content, `${relative} must not import getAdminDb`).not.toMatch(/\bgetAdminDb\b/);
      expect(content, `${relative} must not import getAdminAuth`).not.toMatch(/\bgetAdminAuth\b/);
      expect(content, `${relative} must not import adminWrite functions`).not.toMatch(/\badminUpdate\w+\b/);
    }
  });

  it("verifies release-notes endpoint is strictly read-only", () => {
    const releaseNotesPath = path.join(rootDir, "app", "api", "(core)", "release-notes", "latest", "route.ts");
    const content = fs.readFileSync(releaseNotesPath, "utf-8");

    expect(content).toMatch(/export\s+async\s+function\s+GET\b/);
    expect(content).not.toMatch(/export\s+async\s+function\s+POST\b/);
    expect(content).not.toMatch(/export\s+async\s+function\s+PUT\b/);
    expect(content).not.toMatch(/export\s+async\s+function\s+PATCH\b/);
    expect(content).not.toMatch(/export\s+async\s+function\s+DELETE\b/);
  });

  it("prohibits firebase-admin in AI assistant routes", () => {
    const aiRoutesDir = path.join(rootDir, "app", "api", "(ai)");
    const aiFiles = getFilesRecursively(aiRoutesDir);

    expect(aiFiles.length).toBeGreaterThan(0);

    for (const file of aiFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const relative = path.relative(rootDir, file).replace(/\\/g, "/");

      expect(content, `${relative} must not import firebase-admin`).not.toMatch(/from\s+["']firebase-admin(\/[^"']*)?["']/);
      expect(content, `${relative} must not import getAdminDb`).not.toMatch(/\bgetAdminDb\b/);
    }
  });

  it("prohibits firebase-admin in user data repositories", () => {
    const repoDir = path.join(rootDir, "lib", "firebase", "repositories");
    const repoFiles = getFilesRecursively(repoDir);

    expect(repoFiles.length).toBeGreaterThan(0);

    for (const file of repoFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const relative = path.relative(rootDir, file).replace(/\\/g, "/");

      expect(content, `${relative} must not import firebase-admin`).not.toMatch(/from\s+["']firebase-admin(\/[^"']*)?["']/);
      expect(content, `${relative} must not import getAdminDb`).not.toMatch(/\bgetAdminDb\b/);
    }
  });

  it("enforces caller session token authentication in Firestore client transport", () => {
    const clientPath = path.join(rootDir, "lib", "firebase", "client.ts");
    const content = fs.readFileSync(clientPath, "utf-8");

    expect(content).toContain("Authorization: `Bearer ${session.idToken}`");
    expect(content).toContain("https://firestore.googleapis.com/v1");
  });
});

describe("Security Invariant: Cryptographic Key Strength & Weak Passphrase Rejection", () => {
  it("rejects undefined, null, or non-string keys fail-closed", () => {
    expect(validateEncryptionKey(undefined).valid).toBe(false);
    expect(validateEncryptionKey(null).valid).toBe(false);
    expect(validateEncryptionKey(12345).valid).toBe(false);
    expect(validateEncryptionKey("").valid).toBe(false);
  });

  it("rejects keys under 32 characters in length", () => {
    const result = validateEncryptionKey("short-key-less-than-32-chars");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least 32 characters");
  });

  it("rejects placeholder and weak passphrases from documentation examples", () => {
    const placeholders = [
      "your-custom-super-secret-key-phrase",
      "super-secret-key-phrase-for-continuum",
      "change-me-before-production-please-12345",
      "default-encryption-key-for-local-dev-mode",
      "your-encryption-key-here-12345678901234",
      "abcdefghijklmnopqrstuvwxyz01234567890",
    ];

    for (const placeholder of placeholders) {
      const result = validateEncryptionKey(placeholder);
      expect(result.valid, `Placeholder "${placeholder}" should be rejected`).toBe(false);
      expect(result.error).toContain("prohibited");
    }
  });

  it("rejects low-entropy repetitive keys", () => {
    const lowEntropy = "a".repeat(40);
    const result = validateEncryptionKey(lowEntropy);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("lacks sufficient entropy");
  });

  it("accepts valid high-entropy 256-bit base64 and hex keys", () => {
    const base64Key = crypto.randomBytes(32).toString("base64");
    const hexKey = crypto.randomBytes(32).toString("hex");
    const strongPassphrase = "correct-horse-battery-staple-quantum-teleportation-secure-entropy-987!";

    expect(validateEncryptionKey(base64Key).valid).toBe(true);
    expect(validateEncryptionKey(hexKey).valid).toBe(true);
    expect(validateEncryptionKey(strongPassphrase).valid).toBe(true);
  });

  it("causes encrypt and decrypt to throw fail-closed when given a weak key", () => {
    const saved = process.env.ENCRYPTION_KEY;
    try {
      process.env.ENCRYPTION_KEY = "your-custom-super-secret-key-phrase";
      expect(() => encrypt("Confidential budget")).toThrow(EncryptionError);

      expect(() => decrypt("v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:abcdef")).toThrow(DecryptionError);
    } finally {
      process.env.ENCRYPTION_KEY = saved;
    }
  });
});

describe("Security Invariant: Firestore Security Rules & Schema v2 Pure Path-Isolation", () => {
  const rootDir = process.cwd();
  const rulesPath = path.join(rootDir, "firestore.rules");
  const rulesContent = fs.readFileSync(rulesPath, "utf-8");

  it("prohibits all legacy root-level collections in security rules", () => {
    expect(rulesContent).not.toMatch(/match\s+\/watchlists\/\{userId\}/);
    expect(rulesContent).not.toMatch(/match\s+\/settings\/\{userId\}/);
    expect(rulesContent).not.toMatch(/match\s+\/recommendations\/\{userId\}/);
    expect(rulesContent).not.toMatch(/match\s+\/portfolios\/\{userId\}/);
    expect(rulesContent).not.toMatch(/^\s{4}match\s+\/(?!users\/\{userId\}|\{document=\*\*\}).+/m);
  });

  it("prohibits recursive blanket subcollection wildcards", () => {
    expect(rulesContent).not.toMatch(/\{allSubcollections=\*\*\}/);
    expect(rulesContent).not.toMatch(/\{subDoc=\*\*\}/);
  });

  it("enforces cryptographic envelope validation on financial fields", () => {
    expect(rulesContent).toMatch(/isEncrypted\(request\.resource\.data\.title\)/);
    expect(rulesContent).toMatch(/isEncrypted\(request\.resource\.data\.amount\)/);
  });

  it("restricts user root document modifications to whitelisted profile keys", () => {
    expect(rulesContent).toMatch(/request\.resource\.data\.keys\(\)\.hasOnly/);
  });

  it("enforces fail-closed denial for all unspecified document paths", () => {
    expect(rulesContent).toMatch(/match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
  });
});
