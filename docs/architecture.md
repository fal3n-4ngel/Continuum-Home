# Continuum Home Architecture Specification

This document provides a comprehensive technical breakdown of Continuum Home's system topology, multi-tenant isolation, security boundaries, database design, testing matrix, and threat model.

---

## 1. System Topology & Technology Stack

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Tier                                     │
├────────────────────────────────────────┬────────────────────────────────────────┤
│        Web Application (Browser)       │     External AI Clients (Custom GPTs)  │
│  React 19 + Tailwind CSS + Zustand     │   OpenAPI 3.1 Actions + OAuth 2.0 PKCE │
└───────────────────┬────────────────────┴───────────────────┬────────────────────┘
                    │                                        │
                    ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Next.js 16 Application Server                        │
│                (App Router, Turbopack, Edge Middleware, TypeScript)             │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Authentication & Identity Layer:                                               │
│  - Firebase Auth token verification                                             │
│  - OAuth 2.0 authorization code exchange & session issuance                     │
│  - Per-tenant cryptographic context binding                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  API Routing & Validation Boundary:                                             │
│  - Route handlers with strict Zod payload validation                            │
│  - SSRF-hardened upstream integration proxies                                   │
│  - In-memory cache + Upstash Redis read-through caching                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Core Domain Modules:                                                           │
│  - lib/finance: Asset valuation, SIP math, FD compounding, burn calculators     │
│  - lib/firebase: Subcollection REST client, encryption engine, chunk sharding   │
│  - lib/integrations: AMFI NAV, Yahoo Finance, Trakt, AniList, OMDb, Resend      │
│  - lib/audit-postback: Non-blocking structured audit telemetry streaming       │
└───────────────────┬────────────────────────────────────────┬────────────────────┘
                    │                                        │
                    ▼                                        ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────────┐
│      Google Cloud Firestore Native   │  │    External Upstream Integrations     │
├──────────────────────────────────────┤  ├───────────────────────────────────────┤
│ - Path-isolated subcollections       │  │ - AMFI (Mutual Fund NAVs)             │
│ - AES-256-GCM encrypted ciphertext   │  │ - Yahoo Finance (Equities)            │
│ - Zero elevated backend credentials  │  │ - Trakt.tv / AniList / OMDb (Media)   │
│ - Client ID token security rules     │  │ - Resend (Transactional Digests)      │
│ - 1,500-item auto-chunk sharding     │  │ - Discord Webhooks (Cron Alerts)      │
└──────────────────────────────────────┘  └───────────────────────────────────────┘
```

### Core Technology Decisions

| Layer | Technology | Technical Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (Turbopack) | Server Components and fast compilation. Server routes run isolated stateless computations. |
| **Language** | TypeScript 5 (Strict Mode) | Full compile-time static type safety across schemas, API contracts, and financial math. |
| **Database** | Google Cloud Firestore (Native) | Globally distributed NoSQL document store with ACID document-level transactions and subcollection isolation. |
| **Security & Auth** | Firebase Auth + OAuth 2.0 | Decentralized token verification; backend does not store user passwords or long-lived database keys. |
| **Encryption** | AES-256-GCM | Authenticated symmetric encryption on all financial records, amounts, categories, and portfolio assets. |
| **AI Contract** | OpenAPI 3.1 | Machine-readable API schema enabling direct conversational execution with AI assistants. |

---

## 2. Multi-Tenant Isolation & Zero-Privilege Security

### 2.1. The Zero Admin Service Account Principle

In conventional backend architectures, the web server possesses an elevated administrative database credential (`service_account.json` with superuser access), reading and writing on behalf of users via application code.

**Continuum enforces a Zero-Privilege Architecture for user requests:**
1. The web backend holds **no elevated service account credentials** for user-facing API operations.
2. Every database operation executes over the [Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api) authenticated with the **caller's own Firebase ID token** via `Authorization: Bearer <session.idToken>`.
3. Database isolation is enforced by the Firestore security rule engine at Google's infrastructure level, not merely application-level `if` checks:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.2. AI Mutation Isolation: Why Malicious AI Prompts Cannot Mutate Other Users

A critical security vulnerability in AI-integrated applications is **Prompt Injection / Insecure Direct Object Reference (IDOR)**, where a malicious prompt attempts to trick an LLM into updating another user's records:

> *"Add an expense of 50,000 to user victim_123's ledger."*

Continuum structurally prevents this attack across three independent barriers:

1. **Token-to-Identity Binding (`requireUser`)**:
   When an AI assistant (such as a Custom GPT) executes an action, it authenticates via OAuth 2.0 bearer token. The backend verifies the cryptographic signature of the token and resolves the caller's immutable UID:
   ```typescript
   const session = await requireUser(req);
   const tenantUid = session.uid;
   ```
2. **Payload Disregard for Identity Injection**:
   All mutation endpoints (`POST /api/expenses`, `PATCH /api/portfolio`, `POST /api/watchlist`) ignore any `userId` or `uid` passed in the JSON body. The backend enforces `userId: session.uid` at construction.
3. **Database Path-Level Rejection**:
   Even if the server code were compromised, the outgoing database call targets `/users/{session.uid}/expenses/...` using the caller's ID token. If the request attempts to write to `/users/victim_123/...`, Firestore's security rules evaluate `request.auth.uid == "victim_123"` (which is false) and rejects the write with an immediate `403 Permission Denied`.

---

## 3. Database Architecture & Optimization

### 3.1. Subcollection Hierarchy

All user state is organized in path-isolated subcollections under `/users/{userId}`:

```text
/users/{userId}                                 [Root anchor document]
│
├── /expenses/{expenseId}                       [Subcollection: individual transaction documents]
│
├── /subscriptions/{subscriptionId}             [Subcollection: recurring commitments]
│
├── /portfolio/summary                          [Single document: holdings & valuation history]
│
├── /settings/preferences                       [Single document: UI config & release status]
│
└── /watchlists/{chunkId}                       [Auto-chunked documents: 1,500 items per chunk]
```

### 3.2. Dynamic Range Watchlist Auto-Chunking

To avoid the **500x Read Multiplier Trap** (reading 500 documents for a 500-item watchlist) while preventing the **1 MB Document Size Crash**:

* **Threshold**: Each chunk document holds up to `WATCHLIST_CHUNK_LIMIT = 1500` media entries.
* **Naming**: `/users/{userId}/watchlists/default`, `/users/{userId}/watchlists/chunk_1`, `chunk_2`, etc.
* **Payload Economy**: 1,500 items consume $\approx 480\text{ KB}$, remaining safely within 48% of Firestore's 1 MB physical limit.
* **Read Cost**:
  * Normal users ($< 1,500$ items): **1 document read**.
  * Power users ($3,000$ items): **2 document reads** (instead of 3,000 reads).
* **Write Routing**: Item UUIDs are mapped to their containing chunk; updates target that chunk directly with field masks (`updateMask`), and additions automatically spill over to the next chunk upon reaching 1,500 items.

### 3.3. Encrypted Ciphertext Index Pruning

Sensitive financial fields (`title`, `amount`, `category`, `notes`, `assets`, `valuationHistory`) are encrypted using AES-256-GCM. Because random initialization vectors produce non-deterministic ciphertext that cannot be range-queried, `firestore.indexes.json` explicitly disables automatic single-field B-tree indexes:

```json
{
  "indexes": [],
  "fieldOverrides": [
    { "collectionGroup": "expenses", "fieldPath": "title", "indexes": [] },
    { "collectionGroup": "expenses", "fieldPath": "category", "indexes": [] },
    { "collectionGroup": "expenses", "fieldPath": "notes", "indexes": [] },
    { "collectionGroup": "expenses", "fieldPath": "amount", "indexes": [] },
    { "collectionGroup": "portfolio", "fieldPath": "assets", "indexes": [] },
    { "collectionGroup": "portfolio", "fieldPath": "valuationHistory", "indexes": [] }
  ]
}
```
This reduces database storage consumption by up to 60% and lowers write latency.

### 3.4. Zero-Knowledge Caching Engine

To eliminate memory and distributed cache exposure risks:

* **Ciphertext Storage Only**: The caching tier (Upstash Redis and local process memory) stores strictly raw encrypted Firestore documents. At no point are decrypted financial amounts, ledger titles, or portfolio holdings serialized into Redis or long-lived server memory.
* **Ephemeral In-Memory Decryption**: Decryption via AES-256-GCM occurs strictly in ephemeral runtime memory within the active HTTP request lifecycle. The plaintext records are returned over TLS/HTTPS to authenticated callers and promptly collected by the V8 garbage collector.
* **Microsecond Decryption Latency**: Utilizing hardware-accelerated CPU instructions (AES-NI), decrypting 200 expense entries requires $\approx 0.04\text{ ms}$, representing less than $0.1\%$ of total request latency while preserving 100% of the cost savings of read-through caching.

---

## 4. Verification & Testing Matrix

To guarantee reliability across authentication, financial math, and AI integrations, Continuum implements a comprehensive testing matrix:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Test Verification Pyramid                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  End-to-End (Playwright)                                                    │
│  - Full browser automation: Login, Ledger CRUD, Filter pivots, Dark theme   │
├─────────────────────────────────────────────────────────────────────────────┤
│  API Integration & Authorization Tests (Vitest)                             │
│  - Route handlers with valid/expired/missing Bearer tokens                  │
│  - Cross-tenant IDOR attack simulation & validation                         │
│  - Admin migration & schema transformation verification                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Financial Math Property & Invariant Tests                                  │
│  - Compounding interest, monthly effective burn, SIP rounding               │
│  - Continuous calendar daily trend cadence without date truncation          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Resilience & Circuit Breaking Tests                                        │
│  - Trakt / AniList API outages, invalid responses, network dropouts         │
│  - Discord webhook failure isolation during cron execution                  │
│  - Offline postback retry queues and backoff flushes                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Unit Tests                                                                 │
│  - Pure function verification: date math, encryption, scheme code checks    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1. Financial Calculation Invariants

* **Compounding Precision**: Fixed deposit and SIP computations maintain decimal accuracy and prevent IEEE 754 floating point drift.
* **Effective Monthly Burn**: Subscriptions with weekly, monthly, quarterly, and annual billing cycles are normalized to exact 30.4375-day baseline values.
* **Continuous Daily Cadence**: Daily expense analytics guarantee uniform day-by-day continuous intervals ($7, 30, 90$, or salary pay cycle) filling zero-spend days rather than truncating charts.

### 4.2. Malformed AI Request Fuzzing

All endpoints exposed via OpenAPI 3.1 are validated through strict Zod schemas:
* **String length clamps**: Titles, notes, and names are bounded ($1 \le \text{length} \le 128$).
* **Numeric sanitation**: Amounts must be positive finite numbers; NaN, Infinity, and negative values are rejected with 400 Bad Request before database access.
* **Unknown Field Stripping**: Extraneous keys injected by AI prompts are stripped to prevent prototype pollution or unauthorized field writes.

---

## 5. Threat Model & Attack Surface Mitigation

| Threat Vector | Attack Scenario | Continuum Mitigation |
| :--- | :--- | :--- |
| **Tenant Impersonation** | Attacker passes another user's UID in request payload. | UIDs in JSON payloads are ignored. Identity is derived strictly from the cryptographically verified ID token. |
| **Cross-Tenant Read/Write** | Client requests documents at `/users/victim_id/expenses`. | Firestore security rules evaluate `request.auth.uid == userId` and return 403 Forbidden. |
| **Server-Side Request Forgery (SSRF)** | Malicious image URLs in media imports trigger internal network scanning. | Upstream proxy routes enforce strict hostname allowlists (Trakt, AniList, OMDb, TMDB) and reject local/private IP ranges. |
| **Database Key Compromise** | Web server files or container memory inspected by attacker. | Backend holds no long-lived database credentials or root service account keys. |
| **Ciphertext Leaks** | Attacker obtains raw Firestore database export. | Sensitive fields are stored as AES-256-GCM ciphertext encrypted with a user-configured salt. |
| **Contention & Rate Limiting** | Rapid writes from multiple devices cause document write locks. | Writes use field-level `updateMask` operations and are throttled with in-memory debouncing. |

---

## 6. Self-Host Deployment Architecture

Self-hosters deploy Continuum using standard cloud building blocks:

1. **Host Environment**: Node.js 20+ runtime, Vercel, Docker, or standalone VM.
2. **Database & Auth**: Google Cloud Firebase project with Google Authentication and Firestore Native mode.
3. **Cache (Optional)**: Upstash Redis or local memory for high-frequency token and rate-limit caching.
4. **Configuration**:
   * Deploy security rules: `firebase deploy --only firestore:rules`
   * Deploy index overrides: `firebase deploy --only firestore:indexes`
   * Refer to [`FIREBASE_SCHEMA.md`](firebase-schema.md) for full collection specifications and migration utilities.
