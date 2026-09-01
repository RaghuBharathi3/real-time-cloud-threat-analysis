# 24. One-Click Run & Operations Guide

This guide provides the simple instructions to operate the platform on Windows.

---

## 1. Quick-Start (One-Click)

### To Start:
**Double-click** `START_PROJECT.bat` in the project root.

The launcher executes:
1. Environment & Python/Node verification.
2. Dependency installation (only on first launch).
3. Conflict cleanup on ports `8000` and `5173`.
4. Starts Backend API (`http://127.0.0.1:8000`).
5. Starts Frontend Console (`http://127.0.0.1:5173`).
6. Executes health checks.
7. Automatically opens your default web browser to the dashboard.

### To Stop:
**Double-click** `STOP_PROJECT.bat`.

### To Restart:
**Double-click** `RESTART_PROJECT.bat`.

---

## 2. Ports & Endpoints Reference

| Service | Address | Description |
| :--- | :--- | :--- |
| **Security Dashboard** | `http://127.0.0.1:5173` | Real-time SOC Console |
| **Backend REST API** | `http://127.0.0.1:8000` | FastAPI Multi-Cloud Engine |
| **API Documentation** | `http://127.0.0.1:8000/docs` | Swagger UI Documentation |

---

## 3. First-Run vs. Normal Run Performance
- **First Run**: Creates virtual environment and installs npm/pip packages (~1–2 minutes).
- **Subsequent Runs**: Fast startup (~2 seconds) with immediate health check verification.
