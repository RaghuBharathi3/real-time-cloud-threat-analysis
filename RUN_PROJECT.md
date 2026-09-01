# One-Click Execution and Operations Guide

## Purpose
This guide provides instructions for starting, stopping, restarting, and operating the platform on Windows.

---

## 1. Quick Start

### 1.1 Start the Platform
**Double-click** `START_PROJECT.bat` in the project root directory.

The launcher executes the following tasks automatically:
1. Checks Python 3.10+ and Node.js 18+ environments.
2. Verifies dependencies (installs only if missing).
3. Releases conflicting ports (8000 and 5173).
4. Launches the Backend API at http://127.0.0.1:8000.
5. Launches the Frontend Console at http://127.0.0.1:5173.
6. Performs backend health checks on `/api/v1/health`.
7. Automatically opens your default web browser to the dashboard.

---

### 1.2 Stop the Platform
**Double-click** `STOP_PROJECT.bat`.

Safely terminates background processes and releases ports 8000 and 5173.

---

### 1.3 Restart the Platform
**Double-click** `RESTART_PROJECT.bat`.

Performs a clean shutdown, waits 2 seconds, and restarts all services with health verification.

---

## 2. Ports and Services

| Service | Port | Description |
| :--- | :--- | :--- |
| Frontend Console | 5173 | React 18 + Vite Security Operations Dashboard (http://127.0.0.1:5173) |
| Backend REST API | 8000 | FastAPI Multi-Cloud Ingestion and Analysis Engine (http://127.0.0.1:8000) |
| Interactive API Docs | 8000 | Swagger UI Documentation (http://127.0.0.1:8000/docs) |

---

## 3. Configuration and Demo Mode

The application configuration is managed via `.env` in the project root:

```ini
# Operating Mode
DEMO_MODE=false
DATABASE_URL=sqlite:///backend/app/cloud_security.db

# Cloud Provider Credentials (AWS / Azure / GCP)
AWS_ACCESS_KEY_ID=<YOUR_AWS_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<YOUR_AWS_SECRET_ACCESS_KEY>
AWS_REGION=ap-south-1

AZURE_CLIENT_ID=<YOUR_AZURE_CLIENT_ID>
AZURE_TENANT_ID=<YOUR_AZURE_TENANT_ID>
AZURE_SUBSCRIPTION_ID=<YOUR_AZURE_SUBSCRIPTION_ID>
AZURE_CLIENT_SECRET=<YOUR_AZURE_CLIENT_SECRET>

GOOGLE_PROJECT_ID=<YOUR_GCP_PROJECT_ID>
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json
```

### Switching to Offline Demo Mode:
Set `DEMO_MODE=true` in `.env`. The platform will run locally with synthetic multi-cloud security streams, requiring no external network connectivity or cloud credentials.

---

## 4. Diagnostic Utility

To verify all cloud connections from the command line:

```bash
python scripts/check_cloud_credentials.py
```

---

## 5. Troubleshooting

1. **Port 8000 or 5173 occupied**: Run `STOP_PROJECT.bat` to release ports.
2. **Node.js or Python not found**: Ensure Node.js 18+ and Python 3.10+ are installed and added to your system PATH.
3. **Logs location**: Process logs and runtime PIDs are saved in the `logs/` directory.
