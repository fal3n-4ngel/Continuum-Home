# Contributing to Continuum Home

Thank you for your interest in contributing to Continuum Home! We welcome contributions, bug reports, and feature suggestions.

---

## 📋 Contribution Workflow

To keep the repository organized and avoid duplicate work, please follow these steps for all contributions:

### 1. Raise an Issue First
- **Bug Reports:** Before writing code, please [open an Issue](https://github.com/fal3n-4ngel/Continuum-Home/issues) describing the bug, steps to reproduce, and expected vs actual behavior.
- **Feature Enhancements:** Open an Issue outlining the proposed feature, user value, and design approach to discuss it with maintainers before starting work.

### 2. Branch Naming Conventions
Once the issue is discussed and approved, create a new branch from `main` using one of the following prefixes:

- **Features / Enhancements:** `feature/<short-description>` or `feature/issue-<id>-<description>`
  - *Example:* `feature/custom-pay-periods` or `feature/issue-42-watchlist-export`
- **Bug Fixes:** `bugfix/<short-description>` or `bugfix/issue-<id>-<description>`
  - *Example:* `bugfix/cron-trigger-payload` or `bugfix/issue-18-modal-portal`
- **Releases:** `release/v<major>.<minor>.<patch>`
  - *Example:* `release/v1.1.0` (triggers automated tagging and GitHub release generation)

---

## 🛠️ Local Development Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/fal3n-4ngel/Continuum-Home.git
   cd Continuum-Home
   ```

2. **Checkout Your Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/your-bugfix-name
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Environment Setup:**
   Create a `.env.local` file in the root directory using `.env.example` as a template:
   ```env
   NEXT_PUBLIC_IMDB_API_KEY=your_omdb_api_key
   NEXT_PUBLIC_ANILIST_CLIENT_ID=46468
   NEXT_PUBLIC_TRAKT_CLIENT_ID=your_trakt_client_id
   FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"..."}
   ENCRYPTION_KEY="your-custom-secret-key"
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Assurance

Before opening a Pull Request, verify that all local quality checks pass:

- **Type Check:**
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
- **Production Build Check:**
  ```bash
  npm run build
  ```

---

## 🚀 Submitting a Pull Request (PR)

1. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request on GitHub targeting the `main` branch.
3. Reference the original issue in your PR description (e.g. `Fixes #12` or `Closes #45`).
4. Ensure all CI automated checks (Lint, Typecheck, Integration Tests, Build) pass cleanly.
