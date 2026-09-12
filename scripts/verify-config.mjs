import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const rootDir = process.cwd();
loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env"));

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

const results = [];

function recordCheck(name, passed, message) {
  results.push({ name, passed, message });
}

const [nodeMajor] = process.versions.node.split(".").map(Number);
if (nodeMajor >= 20) {
  recordCheck("Node Engine", true, `v${process.versions.node} (compatible with >=20.0.0)`);
} else {
  recordCheck("Node Engine", false, `v${process.versions.node} is unsupported. Requires >=20.0.0.`);
}

const encryptionKey = process.env.ENCRYPTION_KEY || "";
if (!encryptionKey) {
  recordCheck(
    "ENCRYPTION_KEY",
    false,
    "Missing ENCRYPTION_KEY. Generate one using: openssl rand -base64 32"
  );
} else if (encryptionKey.trim().length < 32) {
  recordCheck(
    "ENCRYPTION_KEY",
    false,
    `Key length (${encryptionKey.trim().length} chars) is too short. Minimum 32 characters (256 bits) required.`
  );
} else {
  const lower = encryptionKey.toLowerCase();
  const matchedPattern = PROHIBITED_KEY_PATTERNS.find((p) => lower.includes(p));
  if (matchedPattern) {
    recordCheck(
      "ENCRYPTION_KEY",
      false,
      `Prohibited placeholder phrase detected ("${matchedPattern}"). Generate a high-entropy key: openssl rand -base64 32`
    );
  } else if (new Set(encryptionKey.trim()).size < 8) {
    recordCheck(
      "ENCRYPTION_KEY",
      false,
      "Key lacks entropy (too few unique characters). Generate a secure key: openssl rand -base64 32"
    );
  } else {
    recordCheck("ENCRYPTION_KEY", true, `Cryptographically valid (${encryptionKey.trim().length} chars, high entropy)`);
  }
}

const firebaseConfig = process.env.FIREBASE_CONFIG || "";
if (!firebaseConfig) {
  recordCheck("FIREBASE_CONFIG", false, "Missing FIREBASE_CONFIG. Required for client/REST Firestore access.");
} else {
  try {
    const parsed = JSON.parse(firebaseConfig);
    if (!parsed.apiKey || !parsed.authDomain || !parsed.projectId) {
      recordCheck("FIREBASE_CONFIG", false, "FIREBASE_CONFIG JSON is missing apiKey, authDomain, or projectId.");
    } else {
      recordCheck("FIREBASE_CONFIG", true, `Configured for project "${parsed.projectId}"`);
    }
  } catch {
    recordCheck("FIREBASE_CONFIG", false, "FIREBASE_CONFIG is not valid JSON.");
  }
}

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || "";
if (serviceAccount) {
  try {
    const parsed = JSON.parse(serviceAccount);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      recordCheck("FIREBASE_SERVICE_ACCOUNT", false, "Service account JSON is missing project_id, client_email, or private_key.");
    } else {
      recordCheck("FIREBASE_SERVICE_ACCOUNT", true, `Configured for service account "${parsed.client_email}"`);
    }
  } catch {
    recordCheck("FIREBASE_SERVICE_ACCOUNT", false, "FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  }
} else {
  recordCheck("FIREBASE_SERVICE_ACCOUNT", true, "Unset (optional for client-only operation; required for background cron jobs)");
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";
if (redisUrl && redisToken) {
  recordCheck("UPSTASH_REDIS", true, "Distributed Redis cache and rate limiting configured");
} else {
  recordCheck("UPSTASH_REDIS", true, "Unset (operating with local in-memory cache and sliding-window fallback)");
}

const cronSecret = process.env.CRON_SECRET || "";
if (cronSecret) {
  recordCheck("CRON_SECRET", true, "Configured");
} else {
  recordCheck("CRON_SECRET", true, "Unset (cron endpoints will reject external invocations)");
}

console.log("\n--- Continuum Configuration Verification ---");
let hasFailure = false;
for (const check of results) {
  const symbol = check.passed ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✖\x1b[0m";
  console.log(`${symbol} ${check.name}: ${check.message}`);
  if (!check.passed) hasFailure = true;
}

if (hasFailure) {
  console.error("\n\x1b[31mConfiguration verification failed. Please remediate the above issues before running Continuum.\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\n\x1b[32mAll configuration checks passed successfully.\x1b[0m\n");
  process.exit(0);
}
