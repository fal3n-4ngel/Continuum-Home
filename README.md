# Continuum

> **A self-hosted, privacy-first financial and asset management command center.**

Continuum replaces single-purpose tracking applications with a unified dashboard for managing finances, investment portfolios, media watchlists, book libraries, and active subscriptions. It is architected to natively integrate with AI assistants through a standardized OpenAPI schema.

---

## ✨ Features

* **Expense Ledger** — Log transactions, categorize expenses, configure location-specific currencies, and filter data by custom financial periods.
* **Investment Portfolios** — Monitor equities, cryptocurrencies, mutual funds, gold, and cash allocations. Supports both manual data entry and live asset valuation.
* **Unified Watchlist** — Consolidate movies, television shows, and anime. Features bidirectional synchronization with AniList and Trakt, CSV imports from Letterboxd, and automated metadata enrichment via OMDb and TVMaze.
* **Book Library** — Interface with the OpenLibrary API to manage reading lists and track progress.
* **Subscription Tracker** — Monitor recurring monthly and annual costs, calculating the true effective monthly expenditure.
* **Scratchpad Notes** — A lightweight, auto-saving interface for persistent volatile memory and quick notes.
* **AI Assistant Integration** — Provides a built-in OpenAPI 3.1 schema (`/api/openapi.json`) for consumption by Custom GPT Actions, Gemini Gems, or Claude Projects. Enables natural-language mutation of database state (e.g., logging expenses or adding media via chat).

---

## 🛠 Architecture & Tech Stack

Continuum is built on a modern, edge-ready tech stack prioritizing performance and security:

* **Frontend Framework:** [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
* **Database & Auth:** [Firebase](https://firebase.google.com) (Google Sign-In + Firestore REST API)
* **Testing:** Vitest, happy-dom
* **Integrations:**
  * **Media Data:** AniList (GraphQL), Trakt (REST), OMDb API, TVMaze API
  * **Book Data:** OpenLibrary API
  * **AI Actions:** OpenAPI 3.1 Spec

---

## 🔒 Security Model

Data privacy and secure isolation are enforced at the database boundary:

* **No Master Server Credentials:** The Next.js backend does not utilize an admin service account. All database transactions are routed through the [Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api), authenticated directly using the client's Firebase ID token.
* **Cryptographic Encryption (AES-256-GCM):** Sensitive financial data (titles, categories, transaction amounts, and notes) is encrypted in-transit using AES-256-GCM symmetric encryption before persisting to Google Firestore, guaranteeing data protection at rest.
* **Database Rules Enforcement:** Ownership checks defined in `firestore.rules` strictly isolate data per user.
* **Hardened API Routes:** Incoming payloads are rigorously validated. Upstream external proxy routes (e.g., Trakt) are strictly allowlisted to mitigate SSRF vulnerabilities.

---

## 🚀 Deployment & Self-Hosting

Continuum can be deployed to Vercel or any Next.js-compatible hosting environment.

### 1. Clone & Install

```bash
git clone https://github.com/fal3n-4ngel/Continuum-Home.git
cd Continuum-Home
npm install
```

### 2. Firebase Configuration

1. Create a project in the [Firebase Console](https://console.firebase.google.com).
2. Enable **Google Sign-in** under **Authentication** → **Sign-in method**.
3. Provision a **Firestore Database**.
4. Navigate to **Project Settings** → **General** → **Add Web App** to generate the configuration snippet.
5. Deploy the required security rules to enforce data isolation:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

### 3. Environment Variables

Create the local environment configuration:
```bash
cp .env.example .env.local
```

Define the `FIREBASE_CONFIG` as a minified JSON string and set your cryptographic key in `.env.local`:
```env
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
ENCRYPTION_KEY="your-custom-super-secret-key-phrase"
```
*(Optional API keys for Trakt, AniList, and OMDb API can also be provided. See [`.env.example`](file:///.env.example).)*

> [!TIP]
> **Bring-Your-Own-Config (BYOC) Mode:** Server-wide environment variables are optional for third-party APIs. Users can supply their API credentials per-request via custom HTTP headers (`X-Firebase-Config`, `X-Trakt-Client-Id`, etc.). See `lib/credentials.ts` for implementation details.

### 4. Initialization

```bash
# Start local development server (http://localhost:3000)
npm run dev

# Execute production build
npm run build && npm run start
```

---

## 🤖 Custom GPT Integration

Continuum exposes an OpenAPI schema allowing interaction via LLMs like ChatGPT.

### 1. Official Public Custom GPT
Initialize the **[Continuum Assistant](https://chatgpt.com/g/g-6a60b01e38c8819187662d1e42c6bee7-Continuum-Home-public)**. Authorization is handled securely via standard OAuth 2.0 upon the first prompt.

### 2. Self-Hosted Custom GPT Configuration
For private self-hosted instances, configure a custom GPT manually:
1. In ChatGPT, navigate to **Explore GPTs** ➔ **Create** ➔ **Configure** ➔ **Actions**.
2. **Import Schema:** Import the OpenAPI schema from `https://your-domain.com/api/openapi.json`.
3. **Configure Authentication:** Select **OAuth**:
   - **Client ID & Secret:** Set arbitrary dummy strings (e.g. `client` / `secret`).
   - **Authorization URL:** `https://your-domain.com/api/oauth/authorize`
   - **Token URL:** `https://your-domain.com/api/oauth/token`
   - **Token Exchange Method:** `Default (POST request)`.
4. **Set Instructions:** Copy the contents of [CUSTOM_GPT_INSTRUCTIONS.md](file:///CUSTOM_GPT_INSTRUCTIONS.md) and paste them into the Instructions configuration box.
5. Save and publish.

---

## 👥 Contribution Guidelines

Contributions are welcome. Please refer to [CONTRIBUTING.md](file:///CONTRIBUTING.md) for detailed policies on:
- Issue creation protocol.
- Branch nomenclature (`feature/`, `bugfix/`).
- Automated CI pipeline execution requirements (`npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`).

---

## 📝 Author's Note: Why This Exists

> Well, it’s been a while since I worked on any public projects—mostly coz I rarely get time after work, and even when I do, it’s usually personal APIs or portfolio updates.
> 
> I already had a system to track my expenses and movies via my personal API, which I enhanced when ChatGPT released Custom GPTs so I could add stuff directly via chat (use AI without paying for an API). Instead of putting AI inside my API, I put my API inside AI (sounded cool in my head).
> 
> Anyway, a friend saw it and wanted it too, so rather than handing over my personal API collection, I decided to build a proper dashboard instead. And here we are!

<a href="https://www.buymeacoffee.com/fal3n4ngel" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

---

## 📜 License

Distributed under the [MIT License](file:///LICENSE).

<!-- GitAds-Verify: 1VTRJ98N18CZX9P4A3NYHVY5CBSXTDFB -->

## GitAds Sponsored
[![Sponsored by GitAds](https://gitads.dev/v1/ad-serve?source=fal3n-4ngel/continuum-home@github)](https://gitads.dev/v1/ad-track?source=fal3n-4ngel/continuum-home@github)
