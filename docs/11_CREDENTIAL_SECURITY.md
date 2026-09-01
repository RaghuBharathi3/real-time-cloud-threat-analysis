# 11. Credential Security and Zero-Leakage Policy

## Purpose
This document specifies secrets management controls, environment boundary definitions, and Git ignore policies enforced in the project.

---

## 1. Secrets Classification

```
┌────────────────────────────────────────────────────────┐
│ 1. Public Variables (Safe for Frontend / VITE_)       │
│    DEMO_MODE, AWS_REGION, GOOGLE_PROJECT_ID            │
├────────────────────────────────────────────────────────┤
│ 2. Server-Only Variables (Backend runtime only)       │
│    DATABASE_URL                                        │
├────────────────────────────────────────────────────────┤
│ 3. Highly Sensitive Secrets (Never sent over network)  │
│    AWS_SECRET_ACCESS_KEY, AZURE_CLIENT_SECRET,         │
│    GOOGLE_APPLICATION_CREDENTIALS, OCI_PRIVATE_KEY     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Git Protection Rules

The `.gitignore` file enforces comprehensive filters preventing sensitive files from being committed:

```gitignore
# Environment and secrets
.env
.env.*
!.env.example
!.env.production.example

# Credentials and key files
credentials/
secrets/
*.pem
*.key
*.p12
*.pfx
*credentials*.json
*service-account*.json

# Databases and process logs
*.db
logs/
.pids/
```

---

## 3. Defense-in-Depth Controls

1. **Client Isolation**: The React/Vite frontend contains zero cloud credentials or private keys. All cloud operations are proxied through FastAPI backend endpoints.
2. **Sanitized API Responses**: Endpoints such as `GET /api/v1/cloud/status` and `GET /api/v1/health` return boolean status flags and identifiers (such as Region and Project ID), omitting secrets entirely.
3. **Log Masking**: Backend logging and the diagnostic CLI tool never echo secret strings, tokens, or private key contents to stdout or log files.
