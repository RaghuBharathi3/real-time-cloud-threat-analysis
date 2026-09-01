# 23. Deployment and Runtime Architecture

## Purpose
This document specifies execution options for local development and containerized cloud deployment.

---

## 1. Local Execution (Primary Target)

For local evaluation, run the automated Windows launchers:
- Start: Double-click `START_PROJECT.bat` (Backend on Port 8000, Frontend on Port 5173).
- Stop: Double-click `STOP_PROJECT.bat`.
- Restart: Double-click `RESTART_PROJECT.bat`.

---

## 2. Containerized Deployment (Production Target)

### Backend Containerization (FastAPI)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ /app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Production Build (Static Hosting)
```bash
cd frontend
npm install
npm run build
```
Deploy the output `frontend/dist` directory to an Nginx server, S3 bucket, or CDN, pointing `VITE_API_URL` to the backend endpoint.
