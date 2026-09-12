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
   git clone https://github.com/fal3n-4ngel/Continuum-Home.git
   cd Continuum-Home
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

Continuum enforces strict automated checks on all branches and Pull Requests. Prior to submitting a Pull Request, verify that all local checks execute successfully:

- **Static Type Analysis:**
  ```bash
  npx tsc --noEmit
  ```
- **Linting:**
  ```bash
  npm run lint
  ```
- **Unit & Integration Tests:**
  ```bash
  npm test
  ```
- **End-to-End Browser Tests:**
  ```bash
  npx playwright test
  ```
- **Production Compilation:**
  ```bash
  npm run build
  ```

### Automated GitHub Actions Pipelines
- **Pre-Merge Verification (`.github/workflows/ci.yml`):** Runs on push and PRs to `main` and `develop`. Executes ESLint, TypeScript compilation, Vitest suite, Next.js production build, and headless Playwright Chromium tests.
- **Security Audit (`.github/workflows/security.yml`):** Audits production dependencies (`npm audit`), executes GitHub's `dependency-review` on PRs, and runs automated CodeQL code scanning via GitHub default setup.

---

## 🚀 Pull Request Protocol

1. Push your branch to the remote origin:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request targeting the `main` branch.
3. Link the PR to its associated issue (e.g., `Fixes #12` or `Resolves #45`).
4. Ensure all automated GitHub Actions checks pass (CI verification, dependency review, and CodeQL analysis).
