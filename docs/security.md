# Security Architecture & Cryptographic Specification

This document details the security principles, authentication mechanics, token handling, and cryptographic models implemented in Continuum Home.

---

## 1. Authentication & Identity Verification

### 1.1. Browser Sessions
* Users authenticate via Google Sign-In managed by Firebase Authentication.
* The frontend receives a short-lived JSON Web Token (ID token) signed by Google's authentication infrastructure.
* The ID token is transmitted in the `Authorization: Bearer <idToken>` header on every HTTP request.
* The backend verifies the token's cryptographic signature, expiration time, and audience against the project's Firebase configuration before granting access.

### 1.2. External AI Clients & Custom GPTs
* AI assistants connect using standard OAuth 2.0 with Proof Key for Code Exchange (PKCE).
* Authorizations issue dedicated scoped tokens bound to the authenticated user's account.
* Refresh tokens are stored securely and permit token rotation without recurring interactive sign-ins.

---

## 2. Zero Elevated Backend Credentials & Privileged Quarantine

### 2.1. Architectural Boundary & Invariant
Unlike traditional server-side applications that store administrative database credentials (such as service accounts with root permissions) for all database interactions:
* **User-Facing Data Routes (`app/api/(core)/**`, `app/api/(ai)/**`)**: Execute with zero server-side admin credentials.
* **Client Repositories (`lib/firebase/repositories/**`)**: Execute with zero server-side admin credentials. All reads and mutations dispatch directly to the Google Cloud Firestore REST API using the caller's Firebase ID token (`fsFetch` with `Authorization: Bearer ${session.idToken}`).
* **Headless Background Jobs (`app/api/(ops)/cron/**`, `app/api/(ops)/admin/**`)**: Headless operations (daily portfolio valuations, email dispatches, schema migrations) operate outside user browser sessions and require server-side Firebase Admin credentials guarded by `CRON_SECRET`.
* **Automated Static Quarantine**: Continuous architecture regression suite (`__tests__/security/architecture-invariants.test.ts`) statically verifies that no user-facing API routes or repositories import `firebase-admin` or privileged Firestore clients.

### 2.2. Native Firestore Security Rules Engine
Access control for user mutations is enforced by Google's native Firestore security rule engine:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function isEncrypted(val) {
      return val is string && val.matches('^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$');
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /expenses/{expenseId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId)
                              && isEncrypted(request.resource.data.title);
      }

      match /subscriptions/{subscriptionId} {
        allow read, write: if isOwner(userId);
      }

      match /portfolio/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /settings/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /watchlists/{docId} {
        allow read, write: if isOwner(userId);
      }

      match /recommendations/{docId} {
        allow read, write: if isOwner(userId);

        match /{subDoc=**} {
          allow read, write: if isOwner(userId);
        }
      }
    }

    match /watchlists/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /settings/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /recommendations/{userId} {
      allow read, write: if isOwner(userId);

      match /entries/{entryId} {
        allow read, write: if isOwner(userId);
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 3. Cryptographic Model: AES-256-GCM

All sensitive financial and personal attributes are encrypted before persistence:

### 3.1. Encrypted Entities
* **Expenses**: `title`, `amount`, `category`, `notes`.
* **Portfolios**: Asset quantities, purchase costs, holding labels, and historical valuation maps.

### 3.2. Algorithm & Cryptographic Envelope Specification
* **Cipher**: AES-256 in Galois/Counter Mode (`aes-256-gcm`).
* **Envelope Format**: `v1:<iv_24hex>:<authTag_32hex>:<ciphertext_hex>`
  * `v1`: Protocol version prefix to support future algorithm migrations.
  * `iv_24hex`: 12-byte cryptographically random initialization vector (`crypto.randomBytes(12)`), encoded as 24 hexadecimal characters.
  * `authTag_32hex`: 16-byte Galois/Counter Mode authentication tag (`cipher.getAuthTag()`), encoded as 32 hexadecimal characters.
  * `ciphertext_hex`: Authenticated ciphertext in hexadecimal encoding.
* **Key Derivation & Entropy Guarantees**:
  * The raw secret is supplied via `ENCRYPTION_KEY` and digested using SHA-256 (`crypto.createHash("sha256").update(secret).digest()`) yielding exactly 256 bits (32 bytes) of cryptographic key material.
  * Administrators must generate high-entropy keys using `openssl rand -base64 32`.
  * **Fail-Closed Validation**: The application strictly rejects keys under 32 characters, keys with low entropy (< 8 unique characters), and placeholder phrases (`your-custom-super-secret-key-phrase`, `change-me`, `password123`, etc.) with `EncryptionError`.
  * Configuration validity can be deterministically audited prior to boot using `npm run verify:config`.
* **Backward Compatibility**: Decryptor transparently parses both versioned (`v1:<iv>:<tag>:<ciphertext>`) and legacy (`<iv>:<tag>:<ciphertext>`) envelopes.
* **Tamper Resistance**: Bit modifications to ciphertext, IV, or authentication tag fail authentication and throw a strongly typed `DecryptionError`.

### 3.3. Key Rotation & Migration Lifecycle
* **Automated Re-encryption**: Key rotations or protocol migrations are executed using the authenticated admin route `POST /api/admin/migrate-encryption`.
* **Migration Procedure**:
  1. Temporary dual-read configuration handles existing records.
  2. The migration endpoint iterates through user documents, reading existing records, verifying authentication tags, and rewriting with the updated key/envelope.
  3. Cache invalidation purges existing Redis and memory buffers.
* **Disaster Recovery**: Due to Galois/Counter Mode integrity guarantees, loss of `ENCRYPTION_KEY` results in permanent data loss for encrypted fields (`title`, `amount`, `category`, `notes`, and portfolio assets). `ENCRYPTION_KEY` must be securely escrowed in production secret managers (Vercel Environment Variables, Google Cloud Secret Manager).

### 3.4. Ciphertext-Only Caching Architecture
* **No Plaintext in Caching Layers**: Upstash Redis and server-side in-memory process stores cache strictly raw encrypted Firestore documents (`v1:iv:tag:ciphertext`).
* **Ephemeral In-Memory Decryption**: Decryption occurs exclusively in-memory during active HTTP request processing right before serialization.
* **Breach Resilience**: In the event of a Redis dump or external cache inspection, an adversary acquires only authenticated AES-256-GCM ciphertexts with zero plaintext financial figures or notes exposed.

---

## 4. Automated Security & Code Scanning

* **Pre-Merge CI (`ci.yml`)**: Executes ESLint, static TypeScript checking (`tsc --noEmit`), Vitest suite (including adversarial SSRF, tenant isolation, and crypto compatibility tests), Next.js build, and headless Playwright tests.
* **Security Audit Pipeline (`security.yml`)**:
  * Production vulnerability audit via `npm audit --omit=dev --audit-level=high`.
  * Pull request dependency review via `dependency-review-action`.
  * Downstream Discord alert dispatch via `if: always() && needs.dependency-audit.result == 'failure' && github.event_name != 'pull_request'`.
* **CodeQL Analysis**: Continuous code scanning is powered by GitHub Default Setup (configured in Repository Settings → Code security → Code scanning), analyzing all Pull Requests and pushes to `main`.

---

## 4. Input Sanitation & Boundary Validation

* **Strict Zod Schemas**: Every API route validates input payloads at the network boundary.
* **Numeric Sanitization**: All financial numbers are verified to be finite positive floats; `NaN`, `Infinity`, and negative inputs are rejected with `400 Bad Request`.
* **String Clamping**: String inputs are clamped to prevent buffer overflows or database abuse.
* **Unknown Field Rejection**: Extraneous JSON properties are stripped before processing.
