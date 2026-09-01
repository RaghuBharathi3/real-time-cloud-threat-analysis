# 24. One-Click Run and Operations Guide

## Purpose
This document provides instructions for operating the platform on Windows using the automated batch launcher scripts.

---

## 1. Execution Procedures

### To Start the Platform:
**Double-click** `START_PROJECT.bat` in the project root directory.

The launcher executes the following tasks in sequence:
1. Verifies Python 3.10+ and Node.js 18+ on the system PATH.
2. Creates virtual environment and installs dependencies (first launch only).
3. Releases existing listeners on ports 8000 and 5173 to prevent conflicts.
4. Starts the Backend API service (`http://127.0.0.1:8000`).
5. Starts the Frontend Console service (`http://127.0.0.1:5173`).
6. Executes health check verification on `/api/v1/health`.
7. Launches the default web browser to the console dashboard.

### To Stop the Platform:
**Double-click** `STOP_PROJECT.bat`.

### To Restart the Platform:
**Double-click** `RESTART_PROJECT.bat`.

---

## 2. Ports and Endpoints

| Service | Address | Description |
| :--- | :--- | :--- |
| Security Dashboard | `http://127.0.0.1:5173` | React Operations Console |
| Backend REST API | `http://127.0.0.1:8000` | FastAPI Multi-Cloud Engine |
| API Documentation | `http://127.0.0.1:8000/docs` | Interactive Swagger UI |

---

## 3. Execution Performance
- **First Launch**: Sets up virtual environment and installs npm/pip dependencies (~1 to 2 minutes).
- **Subsequent Launches**: Starts existing services in approximately 2 seconds.
