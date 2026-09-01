# 23. Deployment & Production Architecture

This document describes options for running the application locally and deploying to production cloud environments.

---

## 1. Local Deployment (Primary Recommendation)

For evaluation and testing, run locally using the provided Windows launchers:
- Double-click `START_PROJECT.bat` to launch both Backend API (Port 8000) and Frontend Console (Port 5173).
- To stop: Double-click `STOP_PROJECT.bat`.

---

## 2. Containerized / Cloud Deployment (Optional)

### Backend Deployment (Docker / Cloud Run / App Service):
1. **Containerfile**:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY backend/requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY backend/ /app/
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
2. **Environment Variables**: Inject `.env` variables via container environment settings.

### Frontend Deployment (Vercel / Netlify / S3):
1. Build static assets:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `frontend/dist` directory. Set `VITE_API_URL` to your production backend URL.
