# Contributing to Continuum

This document outlines the standard operating procedures for contributing to the Continuum repository. Adherence to these guidelines ensures a stable, reviewable, and predictable release cycle.

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
   Initialize a `.env.local` using the provided template:
   ```env
   NEXT_PUBLIC_IMDB_API_KEY=your_omdb_api_key
   NEXT_PUBLIC_ANILIST_CLIENT_ID=46468
   NEXT_PUBLIC_TRAKT_CLIENT_ID=your_trakt_client_id
   FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
   ENCRYPTION_KEY="your-custom-secret-key"
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

---

## 🚀 Pull Request Protocol

1. Push your branch to the remote origin:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request targeting the `main` branch.
3. Link the PR to its associated issue (e.g., `Fixes #12` or `Resolves #45`).
4. Ensure all automated GitHub Actions checks (Lint, Typecheck, Test, Build) return a `0` exit code.
