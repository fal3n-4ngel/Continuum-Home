# Threat Model & Attack Surface Analysis

This document outlines the threat modeling, risk assessments, and defensive mitigations implemented across Continuum Home.

---

## 1. Trust Boundaries

Continuum identifies three primary trust boundaries:

1. **Client Boundary**: Untrusted input originating from web browsers and external AI assistants (Custom GPTs).
2. **Application Boundary**: Next.js 16 server environment performing validation, encryption, pricing calculations, and telemetry dispatch.
3. **Storage Boundary**: Google Cloud Firestore database enforcing tenant-level access rules.

---

## 2. Security Invariants & Threat Scenarios

### 2.1. Tenant Isolation & Identity Derivation
* **Security Invariant**: Resource ownership and mutation paths are derived exclusively from the cryptographically verified session identity (`session.uid`), never from request payloads or foreign identifiers.
* **Threat Scenario**: A malicious actor crafts a request or Custom GPT prompt attempting to mutate another user's financial records (e.g. `{ "userId": "victim_999", "amount": 1000000 }`).
* **Enforcement**:
  * Zod schemas strip extraneous fields, including `userId` and `uid`.
  * Database paths are constructed exclusively using `userPath(session, ...)` pointing to `/users/{session.uid}/...`.
  * Attempting to mutate or access foreign identifiers resolves strictly within the caller's subcollection, returning `404 Not Found`.
  * Firestore security rules provide defense-in-depth, evaluating `request.auth.uid == userId` and returning `403 Permission Denied` if unauthenticated writes are attempted.
* **Automated Test Proof**: Verified by `__tests__/security/tenant-isolation.test.ts`.

### 2.2. Insecure Direct Object Reference (IDOR)
* **Security Invariant**: Cross-tenant data leakage is structurally impossible at both the application subcollection layer and the database rule evaluation layer.
* **Threat Scenario**: An attacker captures their own valid bearer token and attempts to read or mutate another user's document by substituting target UUIDs in URLs (`GET /api/expenses/victim_expense_id`, `PATCH /api/expenses/victim_expense_id`, `DELETE /api/expenses/victim_expense_id`).
* **Enforcement**:
  * All user documents are path-isolated under `/users/{session.uid}/...`.
  * Queries and mutations target solely `/users/{session.uid}/expenses/{id}`. Foreign documents are unreachable from foreign user paths, reliably yielding `404 Not Found`.
* **Automated Test Proof**: Verified by `__tests__/security/tenant-isolation.test.ts`.

### 2.3. Server-Side Request Forgery (SSRF)
* **Security Invariant**: External network egress is restricted to hardcoded, HTTPS-only upstream APIs and verified hostnames. No user-supplied URL or protocol is resolved without strict validation.
* **Threat Scenario**: Media proxy endpoints or financial lookups are tricked into querying internal cloud metadata services (`http://169.254.169.254`), loopback addresses (`127.0.0.1`, `[::1]`), protocol-relative URLs (`//evil.com`), backslash escapes, or traversal payloads.
* **Enforcement**:
  * Trakt proxy route (`/api/trakt/proxy`) uses `resolveTraktUrl`, rejecting protocol-relative URLs, directory traversal (`..`), backslashes, control characters, userinfo credentials, non-standard ports, and unapproved path prefixes.
  * Mutual fund lookups strictly validate AMFI scheme codes against numeric regex `^\d{1,10}$`.
  * Equity lookups validate tickers against sanitized regex `^[A-Z0-9.^=-]{1,20}$`.
* **Automated Test Proof**: Verified by `__tests__/security/ssrf.test.ts`.

### 2.4. Credential Theft & Database Dumping
* **Security Invariant**: No sensitive financial figures, asset holdings, or personal notes exist in plaintext within the primary datastore (Firestore) or caching layer (Redis).
* **Threat Scenario**: An attacker obtains a full database export or backup of Firestore or dumps the Upstash Redis cache.
* **Enforcement**:
  * Sensitive entities are encrypted with AES-256-GCM using authenticated envelopes (`v1:<iv>:<tag>:<ciphertext>`).
  * Upstash Redis and local process memory store only raw ciphertext strings.
  * Without the server's private `ENCRYPTION_KEY`, dumped data is cryptographically indistinguishable from random noise.
* **Automated Test Proof**: Verified by `__tests__/security/encrypted-cache.test.ts` and `__tests__/security/crypto-compatibility.test.ts`.

### 2.5. Rate Limiting & Denial of Service
* **Security Invariant**: Authentication failure attempts are tracked globally across distributed serverless instances via Redis to prevent brute-force attacks.
* **Threat Scenario**: High-frequency concurrent requests attempt to guess tokens or exhaust serverless compute quotas.
* **Enforcement**:
  * Failed authentication attempts increment a distributed counter `ratelimit:auth:failures:<ip>` in Upstash Redis with a 10-minute sliding window (capped at 20 failures before throwing `429 Too Many Requests`), falling back to in-memory sliding window when Redis is unconfigured.
  * Read-through caching in Upstash Redis prevents database quota exhaustion.
  * Document writes utilize atomic `updateMask` operations to avoid race condition write collisions.
* **Automated Test Proof**: Verified by `__tests__/security/tenant-isolation.test.ts`.
