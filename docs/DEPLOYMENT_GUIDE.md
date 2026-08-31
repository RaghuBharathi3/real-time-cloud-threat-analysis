# System Deployment Guide

This guide describes the CI/CD pipeline and hosting configurations for deploying the Cloud Security Console.

---

## 1. Multi-Stage Environments

We maintain three isolated environments to prevent dev configurations from leaking into production:

1. **Development**:
   * Mode: `DEMO_MODE=true`
   * Database: SQLite (`cloud_security.db`)
   * Scope: Local mocks, simulated payment webhook, automatic frontend refresh.
2. **Staging**:
   * Mode: `DEMO_MODE=false`
   * Database: Staging PostgreSQL
   * Scope: Razorpay sandbox API test accounts, testing staging JWT tokens.
3. **Production**:
   * Mode: `DEMO_MODE=false`
   * Database: Production PostgreSQL
   * Scope: Strict credential validations, live webhook sign verification, restricted cloud access roles.

---

## 2. CI/CD Pipeline Flow

The deployment pipeline is configured using GitHub Actions and Vercel Integrations:

```text
  GitHub Push / PR
        │
        ▼
   GitHub Actions
  (Linting & Tests)
        │
  ┌─────┴─────┐
  ▼           ▼
Build      Security Checks (Oxlint / Bandit)
  │
  ▼
Vercel Deployment
  ├── Staging (Preview Deployment)
  └── Production (Release Promotion)
```

### Step 1: CI Linting & Test Verification
On every pull request, GitHub Actions launches a test runner:
1. Installs backend dependencies and executes the pytest suite:
   ```bash
   pip install -r backend/requirements.txt
   pytest
   ```
2. Runs frontend linter and builds the Vite bundle:
   ```bash
   npm install
   npm run lint
   npm run build
   ```

### Step 2: Deployment Config
1. **Frontend (Vercel)**:
   * Configure environment variable `VITE_API_URL` pointing to the backend API endpoint.
   * Under no circumstances define any secret keys (such as `RAZORPAY_KEY_SECRET`) in the Vercel variables dashboard.
2. **Backend (Render / AWS ECS)**:
   * Populate all production environment secrets in your server environment variables dashboard (e.g. Render Dashboard or AWS ECS Task Definitions).
   * Ensure `DEMO_MODE` is explicitly set to `false`.
