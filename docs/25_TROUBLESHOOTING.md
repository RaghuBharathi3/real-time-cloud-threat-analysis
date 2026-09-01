# 25. Troubleshooting & Error Resolution Guide

This guide provides practical resolutions for common startup, dependency, and cloud connectivity issues.

---

## 1. Port Conflicts

### Problem: Port 8000 or 5173 is already in use
- **Cause**: A previous instance of the project was not cleanly terminated.
- **Solution**: Double-click `STOP_PROJECT.bat` or run:
  ```powershell
  Get-NetTCPConnection -LocalPort 8000,5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

---

## 2. Environment & Dependency Issues

### Problem: `Python was not found`
- **Cause**: Python 3.10+ is missing or not configured in system PATH.
- **Solution**: Install Python 3.10+ from `python.org` and check **"Add Python to PATH"**.

### Problem: `Node.js was not found`
- **Cause**: Node.js is missing.
- **Solution**: Install Node.js LTS (18+) from `nodejs.org`.

---

## 3. Cloud Authentication Failures

### Problem: AWS returns `InvalidClientTokenId`
- **Cause**: AWS credentials in `.env` are invalid or deactivated.
- **Solution**: Verify credentials via `python scripts/check_cloud_credentials.py` and update `.env`.

### Problem: Azure returns `AADSTS7000215`
- **Cause**: Azure client secret has expired or was mistyped.
- **Solution**: Generate a new secret in Microsoft Entra ID and update `AZURE_CLIENT_SECRET`.

### Problem: GCP returns `FileNotFoundError: credentials/...`
- **Cause**: Service account JSON key not placed in the exact specified path.
- **Solution**: Place JSON key under `credentials/gcp-service-account.json`.

---

## 4. Operational Fallback

### Problem: No internet or cloud credentials available
- **Solution**: Set `DEMO_MODE=true` in `.env`. The system will operate 100% locally with synthetic multi-cloud security streams.
