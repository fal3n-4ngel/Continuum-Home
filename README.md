<h1 align="center">Continuum — One Dashboard. Everything You Track.</h1>

<p align="center">
  <a href="https://github.com/fal3n-4ngel/Continuum-Home/issues"><img src="https://img.shields.io/github/issues/fal3n-4ngel/Continuum-Home?color=fab387&labelColor=303446&style=for-the-badge" alt="Issues"></a>
  <a href="https://github.com/fal3n-4ngel/Continuum-Home/stargazers"><img src="https://img.shields.io/github/stars/fal3n-4ngel/Continuum-Home?color=ca9ee6&labelColor=303446&style=for-the-badge" alt="Stars"></a>
  <a href="https://github.com/fal3n-4ngel/Continuum-Home"><img src="https://img.shields.io/github/repo-size/fal3n-4ngel/Continuum-Home?color=ea999c&labelColor=303446&style=for-the-badge" alt="Repo Size"></a>
  <a href="https://github.com/fal3n-4ngel/Continuum-Home/blob/main/LICENSE"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&logoColor=ca9ee6&colorA=313244&colorB=cba6f7" alt="License"></a>
</p>

<img width="2073" height="1269" alt="Continuum Dashboard" src="https://github.com/user-attachments/assets/d1968d0b-ee2d-4375-8f60-a03bdd9c3521" />

<p align="center">
  <a href="https://continuum-home.vercel.app/"><strong>🚀 Try Continuum Live Demo</strong></a>
</p>

---

## What is Continuum?

Continuum is a self-hostable personal dashboard for tracking daily expenses, financial health, investment portfolios, subscriptions, and media/book watchlists.

It gives you a clean web dashboard for everyday tracking, backed by a **Model Context Protocol (MCP) server (`/api/mcp`)** and **OpenAPI 3.1 specification (`/api/openapi.json`)** so you can plug your data directly into ChatGPT Plugins, Claude Desktop, Cursor, Windsurf, or any MCP/OpenAPI-compatible AI assistant.

---

## Features

- **💸 Expenses**: Quick-log cash and card spending, filter by **Current / Previous Pay Period**, category, tag, or date range, export CSVs, and view category distribution & daily trends.
- **🫀 Financial Health**: Target-driven daily/weekly safe spending limits, recurring-bill-aware cycle projections, salary history snapshotting (with optional retroactive overwrite), cash-on-hand reconciliation, and liquidity runway.
- **💳 Subscriptions & Recurring Rules**: Track monthly/yearly subscriptions and recurring income, edit rules inline (name, amount, cycle, due date, category, auto-post), and auto-post due entries to your ledger.
- **📈 Portfolio**: Multi-asset tracker for stocks, mutual funds (live NAV via AMFI), SIPs, gold, fixed deposits, and crypto.
- **🎬 Watchlist & 📚 Books**: Unified tracking for movies, TV shows, anime, and books with Trakt, TMDB, AniList, Letterboxd, and Goodreads RSS sync plus OpenLibrary covers.
- **🤖 Universal MCP & ChatGPT Plugin**: Connect `/api/mcp` via OAuth 2.0 (RFC 8414 + Dynamic Client Registration) or Bearer API key to ChatGPT Plugins, Claude, Cursor, or custom AI agents (`/assistant/plugin` setup guide; legacy Custom GPTs deprecated ahead of Dec 11, 2026).
- **🎨 14 Themes & Digest Emails**: Light, dark, and curated color themes with customizable geometry/typography, plus mobile-friendly weekly/monthly expense, renewal, and portfolio close emails.
- **🔐 Encrypted at Rest**: Financial records and holdings are encrypted with your own master key (AES-256-GCM) before being stored.

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/fal3n-4ngel/Continuum-Home.git
cd Continuum-Home
npm ci
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env.local
```

Generate a 256-bit encryption key:
```bash
openssl rand -base64 32
```

Add your Firebase configuration and generated encryption key to `.env.local`:
```env
FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
ENCRYPTION_KEY="<output-from-openssl-rand-base64-32>"
```

Deploy Firestore security rules and index overrides:
```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

### 3. Run

```bash
# Development
npm run dev

# Run tests
npm test

# Production build
npm run build
npm run start
```

---

## Documentation

- **[System Architecture](docs/architecture.md)** — Topology, multi-tenant isolation, caching, and threat model.
- **[Security & Encryption](docs/security.md)** — Cryptographic details, authentication flow, and token boundaries.
- **[Database Schema](docs/firebase-schema.md)** — Subcollections, data models, and migration utilities.
- **[AI Agent & MCP Setup](docs/custom-agent-instructions.md)** — ChatGPT MCP Plugin (`/assistant/plugin`), OAuth 2.0, and agent instructions.

---

## 👥 Contributors

<table>
<tr>
    <td align="center">
        <a href="https://github.com/fal3n-4ngel">
            <img src="https://avatars.githubusercontent.com/u/79042374?v=4" width="100" alt="fal3n-4ngel"/>
            <br />
            <sub><b>Adithya Krishnan</b></sub>
        </a>
    </td>
</tr>
</table>

## License

This project is open-source under the [MIT License](LICENSE). Contributions are welcome—see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📝 Author's Note

> Well, it's been a while since I worked on any public projects—mostly coz I rarely get time after work, and even when I do, it's usually personal APIs or portfolio updates.
>
> I already had a system to track my expenses and movies via my personal API, which I enhanced when ChatGPT released Custom GPTs so I could add stuff directly via chat (use AI without paying for an API). Instead of putting AI inside my API, I put my API inside AI (sounded cool in my head).
>
> Anyway, a friend saw it and wanted it too, so rather than handing over my personal API collection, I decided to build a proper dashboard instead. Most of new UI themes and stuff are built with Antigravity on top of my legacy dashboard, but I did put a lot of effort and time into the core logic and flows.. so no worries , if something breaks or screws up it's totally on me.
>
> Hosting a custom GPT is kinda costly, so please do sponsor me via the button below  :)

<a href="https://www.buymeacoffee.com/fal3n-4ngel" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
