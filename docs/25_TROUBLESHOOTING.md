# 25. Troubleshooting and Error Resolution Guide

## Purpose
This document provides diagnostic resolutions for common port conflicts, environment issues, and credential errors.

---

## 1. Port Conflicts

### Port 8000 or 5173 is already in use
- **Cause**: A previous process was not cleanly terminated.
- **Resolution**: Double-click `STOP_PROJECT.bat` or run:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000,5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

---

## 2. Environment and Dependencies

### Python was not found
- **Cause**: Python 3.10+ is missing from the system PATH.
- **Resolution**: Install Python 3.10+ from python.org and ensure "Add Python to PATH" is selected.

### Node.js was not found
- **Cause**: Node.js is missing.
- **Resolution**: Install Node.js LTS (v18+) from nodejs.org.

---

## 3. Cloud Provider Authentication

### AWS: `InvalidClientTokenId`
- **Cause**: The access key in `.env` is invalid or deactivated.
- **Resolution**: Run `python scripts/check_cloud_credentials.py` and update `.env`.

### Azure: `AADSTS7000215`
- **Cause**: Azure client secret has expired or is incorrect.
- **Resolution**: Create a new secret in Microsoft Entra ID and update `AZURE_CLIENT_SECRET`.

### GCP: `FileNotFoundError: credentials/...`
- **Cause**: The service account JSON key is not located in the expected directory.
- **Resolution**: Place the key at `credentials/gcp-service-account.json`.

---

## 4. Offline Fallback

### No Internet or Cloud Credentials Available
- **Resolution**: Set `DEMO_MODE=true` in `.env`. The system operates entirely offline with synthetic multi-cloud security telemetry.
