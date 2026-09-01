# One-Click Execution & Operations Guide
## AI-Based Framework for Security Risk Evaluation in Multi-Cloud Environments

This guide provides simple instructions for starting, stopping, restarting, and demonstrating the platform on Windows.

---

## 🚀 Quick Start (One-Click)

### 1. Start the Platform
**Double-click** `START_PROJECT.bat` in the project root directory.

The launcher will automatically:
1. Check Python 3.10+ and Node.js 18+ environments.
2. Verify dependencies (installs only if missing).
3. Free conflicting ports (8000 and 5173).
4. Launch the Backend API (`http://127.0.0.1:8000`).
5. Launch the Frontend Security Operations Console (`http://127.0.0.1:5173`).
6. Perform backend health checks.
7. Automatically open your default web browser to the dashboard.

---

### 2. Stop the Platform
**Double-click** `STOP_PROJECT.bat`.

Safely terminates background backend and frontend processes and frees ports 8000 and 5173.

---

### 3. Restart the Platform
**Double-click** `RESTART_PROJECT.bat`.

Performs a clean shutdown, waits 2 seconds, and restarts all services with health verification.

---

## 🛠️ System Architecture & Ports

| Service | Port | Description |
| :--- | :--- | :--- |
| **Frontend Console** | `5173` | React 18 + Vite Security Operations Dashboard (`http://127.0.0.1:5173`) |
| **Backend REST API** | `8000` | FastAPI Multi-Cloud Ingestion & Analysis Engine (`http://127.0.0.1:8000`) |
| **Interactive API Docs**| `8000` | Swagger UI documentation (`http://127.0.0.1:8000/docs`) |

---

## ⚙️ Configuration & Demo Mode

The application configuration is managed via `.env` in the project root:

```ini
# Operating Mode
DEMO_MODE=false
DATABASE_URL=sqlite:///backend/app/cloud_security.db

# Cloud Provider Credentials (AWS / Azure / GCP)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1

AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
AZURE_SUBSCRIPTION_ID=...
AZURE_CLIENT_SECRET=...

GOOGLE_PROJECT_ID=...
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcp-service-account.json
```

### Switching to Offline Demo Mode:
Set `DEMO_MODE=true` in `.env`. The platform will run 100% locally with synthetic multi-cloud security streams, requiring zero internet access or cloud credentials.

---

## 🔍 Diagnostic Utility

To verify all cloud connections from the command line:

```bash
python scripts/check_cloud_credentials.py
```

---

## ❓ Troubleshooting & Common Questions

1. **Port 8000 or 5173 occupied?**
   - Run `STOP_PROJECT.bat` to terminate any zombie instances.
2. **Node.js or Python not recognized?**
   - Ensure Node.js 18+ and Python 3.10+ are installed and added to your Windows system PATH environment variable.
3. **Logs location?**
   - Process logs and runtime PIDs are saved under `logs/`.
