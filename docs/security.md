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

## 2. Zero Elevated Backend Credentials

Unlike traditional server-side applications that store administrative database credentials (such as service accounts with root permissions):
* Continuum's user-facing API routes execute without an admin service account.
* Database requests are dispatched directly to the Google Cloud Firestore REST API using the caller's own Firebase ID token.
* Access control is enforced by Google's native Firestore security rule engine:

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

---

## 3. Cryptographic Model: AES-256-GCM

All sensitive financial and personal attributes are encrypted before persistence:

### 3.1. Encrypted Entities
* **Expenses**: `title`, `amount`, `category`, `notes`.
* **Portfolios**: Asset quantities, purchase costs, holding labels, and historical valuation maps.

### 3.2. Algorithm & Security Guarantees
* **Cipher**: AES-256 in Galois/Counter Mode (GCM).
* **Key Derivation**: Configured via the `ENCRYPTION_KEY` environment variable.
* **Initialization Vectors**: A fresh, cryptographically secure 12-byte random initialization vector (IV) is generated for each encryption operation.
* **Integrity Authentication**: GCM calculates an authentication tag that verifies ciphertext integrity and prevents tampering or bit-flipping attacks.
* **Format**: Ciphertext is stored as `iv:authTag:ciphertext` in Base64 encoding.

---

## 4. Input Sanitation & Boundary Validation

* **Strict Zod Schemas**: Every API route validates input payloads at the network boundary.
* **Numeric Sanitization**: All financial numbers are verified to be finite positive floats; `NaN`, `Infinity`, and negative inputs are rejected with `400 Bad Request`.
* **String Clamping**: String inputs are clamped to prevent buffer overflows or database abuse.
* **Unknown Field Rejection**: Extraneous JSON properties are stripped before processing.
