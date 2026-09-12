# Security Policy

Continuum Home treats security, confidentiality, and data privacy as fundamental requirements. This document outlines our vulnerability reporting policy, response timelines, and security architecture scope.

---

## 1. Reporting a Vulnerability

If you discover a security vulnerability in Continuum Home, please report it responsibly rather than opening a public issue.

### Primary Reporting Channels

* **GitHub Security Advisory (Preferred):** [Submit an advisory](https://github.com/fal3n-4ngel/Continuum-Home/security/advisories/new)
* **Direct Email:** [hello@adithyakrishnan.com](mailto:hello@adithyakrishnan.com)

Please provide as much information as possible to help us triage the issue quickly:
* Description of the vulnerability and potential impact.
* Step-by-step reproduction steps or proof-of-concept (PoC).
* Affected versions, environments, or API routes.
* Any potential remediations or patches you have identified.

---

## 2. Response & Remediation SLA

Maintainers are committed to timely review and resolution:

* **Initial Acknowledgment:** Within 48 hours of receipt.
* **Triage & Severity Assessment:** Within 5 business days.
* **Remediation & Patch Release:** Priority fixes deployed to `main` and tagged releases within 14 business days.
* **Public Disclosure:** Coordinated with the reporter after a patch has been released and deployed.

---

## 3. Scope of Security Coverage

### In Scope
* Next.js API endpoints (`/api/**`), authentication middleware, and session management.
* Server-side cryptographic operations (AES-256-GCM token encryption and record encryption).
* Upstash Redis and in-memory cache isolation (enforcing ciphertext-only storage for sensitive records).
* Cloud Firestore security rules and path-isolated subcollection boundaries (`/users/{userId}/**`).
* Server-Side Request Forgery (SSRF) mitigations across external API proxies (TMDb, Trakt, Yahoo Finance).

### Out of Scope
* Rate limits or outages caused by upstream third-party APIs (AniList, Trakt, Yahoo Finance, OpenLibrary).
* Vulnerabilities requiring root access or physical access to the host machine running the client browser.
* Denial of Service (DoS) attacks targeting hosting infrastructure rather than application logic flaws.
* Social engineering or phishing attempts against project maintainers or users.

---

## 4. Safe Harbor

Any activities conducted in good faith that adhere to this policy will be treated as authorized research:
* We will not pursue legal action or report authorized research to law enforcement.
* We will work collaboratively with you to validate and resolve the vulnerability.
* We will publicly credit your contribution in release notes and security advisories (unless you prefer anonymity).

---

## 5. Security Architecture Summary

For technical specifications regarding our cryptographic model, data flow matrix, and subcollection architecture:
* [Security Documentation](docs/security.md)
* [Threat Model](docs/threat-model.md)
* [Database Architecture & Schema Guide](docs/firebase-schema.md)
* [RFC 9116 security.txt](.well-known/security.txt)
