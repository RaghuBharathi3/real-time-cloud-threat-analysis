# 11. Credential Security & DevSecOps Posture

This document defines the secrets isolation controls, environment configuration boundaries, and zero-leakage security posture enforced in the repository.

---

## 1. Secrets Classification & Boundary Control

Configuration variables are classified into three strict tiers:

```
┌────────────────────────────────────────────────────────┐
│ 1. Public Variables (Safe for Frontend / VITE_)       │
│    DEMO_MODE, AWS_REGION, GOOGLE_PROJECT_ID            │
├────────────────────────────────────────────────────────┤
│ 2. Server-Only Variables (Backend execution only)      │
│    DATABASE_URL                                        │
├────────────────────────────────────────────────────────┤
│ 3. Highly Sensitive Secrets (Never sent over network)  │
│    AWS_SECRET_ACCESS_KEY, AZURE_CLIENT_SECRET,         │
│    GOOGLE_APPLICATION_CREDENTIALS, OCI_PRIVATE_KEY     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Git Protection & Ignore Rules

The `.gitignore` file enforces comprehensive filters preventing secret leakage into version control:

```gitignore
# Environment & Secret files
.env
.env.*
!.env.example
!.env.production.example

# Credentials & Service Accounts
credentials/
*.pem
*.key
*service-account*.json
*credentials*.json

# Local Databases & Logs
*.db
logs/
.pids/
```

---

## 3. Defense-in-Depth Measures

1. **Frontend Isolation**: The React/Vite client contains **zero** cloud credentials or private keys. The frontend communicates exclusively with the FastAPI backend via `/api/v1/` endpoints.
2. **API Response Sanitization**: Endpoints such as `GET /api/v1/cloud/status` and `GET /api/v1/health` return state flags (`CONNECTED`, `CONFIGURED`, `DEMO MODE`) and non-sensitive identifiers (e.g. Region, Project ID), omitting secrets entirely.
3. **Logging & Diagnostic Masking**: The diagnostic CLI and backend logs never echo private keys, passwords, or secret strings during authentication or validation.
4. **Credential Rotation Policy**: In production deployments, IAM access keys and service account JSON credentials should be rotated every 90 days.
