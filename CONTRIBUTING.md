# Contributing to Continuum

This document covers how to get set up locally and what's expected of a PR — issue tracking, branch naming, and the checks that run before a merge.

---

## 📋 Contribution Workflow

To maintain repository hygiene, please follow the defined contribution lifecycle:

### 1. Issue Tracking
All code changes must trace back to an established Issue.
- **Defects:** Create an Issue detailing the bug, reproduction steps, expected behavior, and environment metrics.
- **Feature Proposals:** Create an Issue outlining the architectural design and user value of the proposed feature to align with maintainers prior to implementation.

### 2. Branch Nomenclature
Branch from `main` using the following standardized namespaces:

- **Features / Enhancements:** `feature/<short-description>` or `feature/issue-<id>-<description>`
  - *Example:* `feature/custom-pay-periods`
- **Defect Resolutions:** `bugfix/<short-description>` or `bugfix/issue-<id>-<description>`
  - *Example:* `bugfix/cron-trigger-payload`
- **Releases:** `release/v<major>.<minor>.<patch>`
  - *Example:* `release/v1.1.0` (Triggers automated tagging and release artifacts)

---

## 🛠️ Local Development Environment

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/fal3n-4ngel/personal-dashboard.git
   cd personal-dashboard
   ```

2. **Initialize Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Environment Configuration:**
   Copy the template and fill in `FIREBASE_CONFIG` + `ENCRYPTION_KEY` at minimum — see [`.env.example`](.env.example) for the full list (Trakt, AniList, TMDb are optional):
   ```bash
   cp .env.example .env.local
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   The application will be exposed at `http://localhost:3000`.

---

## 🧪 Quality Assurance & CI/CD Validation

Continuum utilizes an automated CI/CD pipeline. Prior to submitting a Pull Request, verify that all local checks execute successfully:

- **Static Type Analysis:**
  ```bash
  npx tsc --noEmit
  ```
- **Linting:**
  ```bash
  npm run lint
  ```
- **Integration Tests:**
  ```bash
  npm run test
  ```
- **Production Compilation:**
  ```bash
  npm run build
  ```

PRs are also checked by `dependency-review` (fails on a newly introduced dependency with a known high/critical vulnerability) and CodeQL's default code scanning — neither has a local equivalent to run beforehand, but both show up as PR checks.

---

## 🚀 Pull Request Protocol

1. Push your branch to the remote origin:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request targeting the `main` branch.
3. Link the PR to its associated issue (e.g., `Fixes #12` or `Resolves #45`).
4. Ensure all automated GitHub Actions checks (lint, typecheck, test, build, dependency review) pass.
